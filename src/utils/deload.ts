import { supabase } from "@/integrations/supabase/client";

export type DeloadMode = "volume" | "carga" | "combinado";
export type DeloadMetade = "primeira" | "segunda";

export interface DeloadOriginSet {
  numero_serie: number;
  peso: number | null;
  repeticoes: number | null;
}

export interface DeloadOriginExercise {
  id: string; // origin exercise id (from exercicios_treino_usuario or _avancado)
  nome: string;
  grupo_muscular: string | null;
  ordem: number;
  series: number; // programmed series count
  incremento_minimo: number | null;
  sets: DeloadOriginSet[]; // saved series (peso/reps) from series_exercicio_usuario
  isAdvanced: boolean;
}

/**
 * Compute deload values for a single set based on mode.
 * - volume: keep peso, cut reps by 50% (ceil)
 * - carga: keep reps, cut peso by 50% (ceil to increment)
 * - combinado: cut both peso and reps by 50%
 * Series-count deload is handled at the exercise level.
 */
export function computeDeloadSet(
  set: DeloadOriginSet,
  mode: DeloadMode,
  incrementoMinimo: number | null
): { peso: number | null; repeticoes: number | null } {
  const inc = incrementoMinimo && incrementoMinimo > 0 ? incrementoMinimo : 1;
  const pesoBase = set.peso ?? 0;
  const repsBase = set.repeticoes ?? 0;

  if (mode === "volume") {
    return {
      peso: pesoBase,
      repeticoes: repsBase > 0 ? Math.ceil(repsBase / 2) : repsBase,
    };
  }
  if (mode === "carga") {
    const halved = pesoBase / 2;
    const rounded = Math.ceil(halved / inc) * inc;
    return {
      peso: Math.max(0, rounded),
      repeticoes: repsBase,
    };
  }
  // combinado
  const halved = pesoBase / 2;
  const rounded = Math.ceil(halved / inc) * inc;
  return {
    peso: Math.max(0, rounded),
    repeticoes: repsBase > 0 ? Math.ceil(repsBase / 2) : repsBase,
  };
}

/**
 * How many series should the deload exercise have given the original series count and mode.
 * Volume/combinado cut series in half (ceil). Carga preserves the count.
 */
export function computeDeloadSeriesCount(
  originalCount: number,
  mode: DeloadMode
): number {
  if (mode === "carga") return Math.max(1, originalCount);
  return Math.max(1, Math.ceil(originalCount / 2));
}

/**
 * Compute the full array of deload sets for an exercise, applying the
 * inter-set 20% floor rule on reps for `volume` and `combinado` modes.
 *
 * Rule: for sets N >= 2, reps cannot drop below 80% of the previous set's
 * deload reps (ceil). This prevents special-method exercises (e.g. Rest Pause)
 * from ending up with unrealistically low deload reps like 2-4.
 *
 * The `carga` mode is unaffected — it preserves the original reps verbatim.
 */
export function computeDeloadExerciseSets(
  baselineSets: DeloadOriginSet[],
  mode: DeloadMode,
  incrementoMinimo: number | null
): Array<{ numero_serie: number; peso: number | null; repeticoes: number | null }> {
  const computed = baselineSets.map((b) => {
    const c = computeDeloadSet(b, mode, incrementoMinimo);
    return { numero_serie: b.numero_serie, peso: c.peso, repeticoes: c.repeticoes };
  });

  if (mode === "carga") return computed;

  for (let i = 1; i < computed.length; i++) {
    const prevReps = computed[i - 1].repeticoes;
    const curReps = computed[i].repeticoes;
    if (prevReps == null || prevReps <= 0) continue;
    if (curReps == null || curReps <= 0) continue;
    const floor = Math.ceil(prevReps * 0.8);
    if (curReps < floor) {
      computed[i].repeticoes = floor;
    }
  }

  return computed;
}

/**
 * Check whether the deload button should be visible for the current program.
 * Conditions:
 * - level is 'intermediario' or 'avancado' (never iniciante)
 * - user reached at least week 3 (has any treino with ordem_semana >= 3
 *   that is concluido OR at least one week-2 treino concluido — i.e. week 3 was reached).
 * - no deload week already exists for this program
 */
export async function canStartDeload(
  programaUsuarioId: string,
  nivel: string | null
): Promise<{ eligible: boolean; alreadyExists: boolean }> {
  if (!nivel || nivel === "iniciante") {
    return { eligible: false, alreadyExists: false };
  }

  // Any existing deload?
  const { data: existing } = await supabase
    .from("deload_semanas" as any)
    .select("id")
    .eq("programa_usuario_id", programaUsuarioId)
    .maybeSingle();

  if (existing) {
    return { eligible: false, alreadyExists: true };
  }

  // Any completed treino at week >= 2? (means user started week 3 or later —
  // once week 2 has a completed workout, the user has entered the week-3+ arc)
  // To keep intent simple and match the spec ("initiated week 3"), we check
  // for any treino at ordem_semana >= 3 that is concluido OR pulado.
  const { data: reached } = await supabase
    .from("treinos_usuario")
    .select("id")
    .eq("programa_usuario_id", programaUsuarioId)
    .gte("ordem_semana", 3)
    .or("concluido.eq.true,pulado.eq.true")
    .limit(1);

  return { eligible: (reached?.length ?? 0) > 0, alreadyExists: false };
}

/**
 * Fetch, for a given programa_usuario, the last completed treino per ordem_dia.
 * Returns a map ordem_dia -> treino_usuario row (id, ordem_dia, nome, ordem_semana).
 */
export async function fetchOriginTreinosByOrdemDia(
  programaUsuarioId: string
): Promise<
  Record<
    number,
    { id: string; ordem_dia: number; nome: string; ordem_semana: number }
  >
> {
  const { data: treinos, error } = await supabase
    .from("treinos_usuario")
    .select("id, ordem_dia, ordem_semana, nome, concluido, pulado")
    .eq("programa_usuario_id", programaUsuarioId)
    .order("ordem_semana", { ascending: false });

  if (error || !treinos) return {};

  const byDia: Record<
    number,
    { id: string; ordem_dia: number; nome: string; ordem_semana: number }
  > = {};

  for (const t of treinos as any[]) {
    if (t.pulado) continue;
    if (!t.concluido) continue;
    const key = t.ordem_dia as number;
    if (byDia[key]) continue; // we already have a higher week one
    byDia[key] = {
      id: t.id,
      ordem_dia: t.ordem_dia,
      nome: t.nome,
      ordem_semana: t.ordem_semana,
    };
  }

  // Fallback for days with no completed workout: use the highest-week treino
  // (even if not completed) so we still generate a deload day for that ordem_dia.
  for (const t of treinos as any[]) {
    const key = t.ordem_dia as number;
    if (byDia[key]) continue;
    byDia[key] = {
      id: t.id,
      ordem_dia: t.ordem_dia,
      nome: t.nome,
      ordem_semana: t.ordem_semana,
    };
  }

  return byDia;
}

/**
 * Create the deload_semanas + deload_dias rows for a program.
 * Does NOT create deload_series rows — those are created on-the-fly as the user
 * concludes sets in the DeloadWorkout page.
 */
export async function initiateDeloadWeek(
  programaUsuarioId: string,
  userId: string,
  frequenciaSemanal: number
): Promise<{ deloadSemanaId: string } | null> {
  const originMap = await fetchOriginTreinosByOrdemDia(programaUsuarioId);
  const ordensDia = Array.from({ length: frequenciaSemanal }, (_, i) => i + 1);

  // Compute halves: first half rounds up.
  const primeiraCount = Math.ceil(frequenciaSemanal / 2);

  const { data: semana, error: semanaErr } = await supabase
    .from("deload_semanas" as any)
    .insert({
      programa_usuario_id: programaUsuarioId,
      user_id: userId,
      concluido: false,
    })
    .select("id")
    .single();

  if (semanaErr || !semana) {
    console.error("Erro ao criar deload_semana:", semanaErr);
    return null;
  }

  const semanaId = (semana as any).id as string;

  const diasRows = ordensDia.map((ordemDia) => {
    const origin = originMap[ordemDia];
    const metade: DeloadMetade =
      ordemDia <= primeiraCount ? "primeira" : "segunda";
    return {
      deload_semana_id: semanaId,
      user_id: userId,
      ordem_dia: ordemDia,
      nome: origin?.nome ?? `Dia ${ordemDia}`,
      treino_origem_id: origin?.id ?? null,
      metade,
      concluido: false,
    };
  });

  const { error: diasErr } = await supabase
    .from("deload_dias" as any)
    .insert(diasRows);

  if (diasErr) {
    console.error("Erro ao criar deload_dias:", diasErr);
    return null;
  }

  return { deloadSemanaId: semanaId };
}

/**
 * Load origin exercises (from advanced or beginner table) with their saved series.
 */
export async function loadOriginExercises(
  treinoOrigemId: string
): Promise<DeloadOriginExercise[]> {
  const results: DeloadOriginExercise[] = [];

  const { data: baseEx } = await supabase
    .from("exercicios_treino_usuario")
    .select(
      "id, nome, grupo_muscular, ordem, series, oculto, incremento_minimo, substituto_nome"
    )
    .eq("treino_usuario_id", treinoOrigemId);

  const { data: advEx } = await supabase
    .from("exercicios_treino_usuario_avancado" as any)
    .select(
      "id, nome, grupo_muscular, ordem, series, oculto, incremento_minimo, substituto_nome"
    )
    .eq("treino_usuario_id", treinoOrigemId);

  const collected: Array<{ row: any; isAdvanced: boolean }> = [
    ...((baseEx || []) as any[]).map((r) => ({ row: r, isAdvanced: false })),
    ...((advEx as any[]) || []).map((r) => ({ row: r, isAdvanced: true })),
  ];

  if (collected.length === 0) return results;

  const allIds = collected.map((c) => c.row.id);
  const { data: allSeries } = await supabase
    .from("series_exercicio_usuario")
    .select("exercicio_usuario_id, numero_serie, peso, repeticoes")
    .in("exercicio_usuario_id", allIds);

  const seriesByExercise: Record<string, DeloadOriginSet[]> = {};
  for (const s of (allSeries as any[]) || []) {
    const key = s.exercicio_usuario_id as string;
    if (!seriesByExercise[key]) seriesByExercise[key] = [];
    seriesByExercise[key].push({
      numero_serie: s.numero_serie,
      peso: s.peso,
      repeticoes: s.repeticoes,
    });
  }

  for (const { row, isAdvanced } of collected) {
    if (row.oculto) continue;
    const sets = (seriesByExercise[row.id] || []).sort(
      (a, b) => a.numero_serie - b.numero_serie
    );
    results.push({
      id: row.id,
      nome: row.substituto_nome || row.nome,
      grupo_muscular: row.grupo_muscular,
      ordem: row.ordem,
      series: Number(row.series) || sets.length || 1,
      incremento_minimo: row.incremento_minimo,
      sets,
      isAdvanced,
    });
  }

  return results.sort((a, b) => a.ordem - b.ordem);
}

/**
 * Given origin sets and a target series count, produce baseline sets to use.
 * If fewer sets than count, replicate the last set. If more, take the first `count`.
 */
export function buildBaselineSets(
  originSets: DeloadOriginSet[],
  seriesCount: number
): DeloadOriginSet[] {
  const base = originSets.filter((s) => s.peso != null || s.repeticoes != null);
  if (base.length === 0) {
    return Array.from({ length: seriesCount }, (_, i) => ({
      numero_serie: i + 1,
      peso: null,
      repeticoes: null,
    }));
  }
  const out: DeloadOriginSet[] = [];
  for (let i = 0; i < seriesCount; i++) {
    const src = base[i] ?? base[base.length - 1];
    out.push({
      numero_serie: i + 1,
      peso: src.peso ?? null,
      repeticoes: src.repeticoes ?? null,
    });
  }
  return out;
}
