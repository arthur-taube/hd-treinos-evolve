import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeTargetDate, getCurrentUserId } from "@/utils/statsQueries";
import { endOfWeek, startOfWeek } from "date-fns";

export const DEFAULT_MUSCLE_GROUPS = [
  "Peitoral",
  "Dorsais",
  "Bíceps",
  "Tríceps",
  "Deltoide Lateral",
  "Quadríceps",
  "Posteriores",
];

interface OrigExercise {
  id: string;
  primary_muscle: string | null;
  secondary_muscle: string | null;
  tertiary_muscle: string | null;
  quaternary_muscle: string | null;
  auxiliary_muscle_1: string | null;
  auxiliary_muscle_2: string | null;
  auxiliary_muscle_3: string | null;
  auxiliary_muscle_4: string | null;
}

interface CardRow {
  id: string;
  treino_usuario_id: string;
  exercicio_original_id: string | null;
  substituto_oficial_id: string | null;
  substituicao_neste_treino: boolean | null;
  series: number | null;
  oculto: boolean | null;
  level: "iniciante" | "avancado";
}

export interface VolumeBar {
  muscle: string;
  previsto: number;
  realizado: number;
}

export function useVolumeData(weekAnchor: Date) {
  const [muscles, setMuscles] = useState<Set<string>>(new Set());
  const [bars, setBars] = useState<VolumeBar[]>([]);
  const [allMusclesUniverse, setAllMusclesUniverse] = useState<string[]>([]);
  const [preferredGroups, setPreferredGroups] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const weekStart = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);
  const weekEnd = useMemo(() => endOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const uid = await getCurrentUserId();
      if (!uid) {
        setLoading(false);
        return;
      }

      const [{ data: profile }, { data: begOrig }, { data: advOrig }] = await Promise.all([
        supabase.from("profiles").select("stats_volume_grupos_padrao").eq("id", uid).maybeSingle(),
        supabase
          .from("exercicios_iniciantes")
          .select(
            "id, primary_muscle, secondary_muscle, tertiary_muscle, quaternary_muscle, auxiliary_muscle_1, auxiliary_muscle_2, auxiliary_muscle_3, auxiliary_muscle_4"
          ),
        supabase
          .from("exercicios_avancados")
          .select(
            "id, primary_muscle, secondary_muscle, tertiary_muscle, quaternary_muscle, auxiliary_muscle_1, auxiliary_muscle_2, auxiliary_muscle_3, auxiliary_muscle_4"
          ),
      ]);

      const prefs = (profile?.stats_volume_grupos_padrao as string[] | null) ?? null;
      setPreferredGroups(prefs);
      const chosen = new Set(prefs && prefs.length > 0 ? prefs : DEFAULT_MUSCLE_GROUPS);
      setMuscles(chosen);

      const origMap = new Map<string, OrigExercise>();
      const universe = new Set<string>();
      for (const r of ((begOrig ?? []) as OrigExercise[]).concat((advOrig ?? []) as OrigExercise[])) {
        origMap.set(r.id, r);
        [
          r.primary_muscle,
          r.secondary_muscle,
          r.tertiary_muscle,
          r.quaternary_muscle,
          r.auxiliary_muscle_1,
          r.auxiliary_muscle_2,
          r.auxiliary_muscle_3,
          r.auxiliary_muscle_4,
        ]
          .filter(Boolean)
          .forEach(m => universe.add(m as string));
      }
      setAllMusclesUniverse(Array.from(universe).sort((a, b) => a.localeCompare(b)));

      // 1. get user programs
      const { data: programs } = await supabase
        .from("programas_usuario")
        .select("id, data_inicio")
        .eq("usuario_id", uid);
      const programIds = programs?.map(p => p.id) ?? [];
      const startMap = new Map((programs ?? []).map(p => [p.id, p.data_inicio]));
      if (programIds.length === 0) {
        setBars([]);
        setLoading(false);
        return;
      }

      // 2. get treinos and filter by week
      const { data: treinos } = await supabase
        .from("treinos_usuario")
        .select("id, programa_usuario_id, ordem_semana, ordem_dia")
        .in("programa_usuario_id", programIds);

      const weekTreinoIds: string[] = [];
      for (const t of treinos ?? []) {
        const di = startMap.get(t.programa_usuario_id);
        if (!di) continue;
        const target = computeTargetDate(di, t.ordem_semana, t.ordem_dia ?? 1);
        if (target >= weekStart && target <= weekEnd) weekTreinoIds.push(t.id);
      }

      if (weekTreinoIds.length === 0) {
        setBars([]);
        setLoading(false);
        return;
      }

      // 3. get exercise cards
      const [{ data: begCards }, { data: advCards }] = await Promise.all([
        supabase
          .from("exercicios_treino_usuario")
          .select(
            "id, treino_usuario_id, exercicio_original_id, substituto_oficial_id, substituicao_neste_treino, series, oculto"
          )
          .in("treino_usuario_id", weekTreinoIds),
        supabase
          .from("exercicios_treino_usuario_avancado")
          .select(
            "id, treino_usuario_id, exercicio_original_id, substituto_oficial_id, substituicao_neste_treino, series, oculto"
          )
          .in("treino_usuario_id", weekTreinoIds),
      ]);
      const cards: CardRow[] = [];
      for (const r of (begCards ?? []) as any[]) cards.push({ ...r, level: "iniciante" });
      for (const r of (advCards ?? []) as any[]) cards.push({ ...r, level: "avancado" });

      const activeCards = cards.filter(c => !c.oculto);
      const cardIds = activeCards.map(c => c.id);

      // 4. get realized series for those cards
      let realizedByCard = new Map<string, number>();
      if (cardIds.length > 0) {
        const { data: sers } = await supabase
          .from("series_exercicio_usuario")
          .select("exercicio_usuario_id")
          .eq("user_id", uid)
          .eq("concluida", true)
          .in("exercicio_usuario_id", cardIds);
        for (const s of sers ?? []) {
          realizedByCard.set(
            s.exercicio_usuario_id,
            (realizedByCard.get(s.exercicio_usuario_id) ?? 0) + 1
          );
        }
      }

      // 5. aggregate volume by muscle
      const previstoMap = new Map<string, number>();
      const realizadoMap = new Map<string, number>();
      const bump = (map: Map<string, number>, muscle: string | null, val: number) => {
        if (!muscle) return;
        map.set(muscle, (map.get(muscle) ?? 0) + val);
      };

      for (const c of activeCards) {
        const origId = c.substituicao_neste_treino
          ? c.substituto_oficial_id ?? c.exercicio_original_id
          : c.exercicio_original_id;
        if (!origId) continue;
        const orig = origMap.get(origId);
        if (!orig) continue;

        const previstoSeries = c.series ?? 0;
        const realizadoSeries = realizedByCard.get(c.id) ?? 0;

        const primaries = [
          orig.primary_muscle,
          orig.secondary_muscle,
          orig.tertiary_muscle,
          orig.quaternary_muscle,
        ];
        const auxiliaries = [
          orig.auxiliary_muscle_1,
          orig.auxiliary_muscle_2,
          orig.auxiliary_muscle_3,
          orig.auxiliary_muscle_4,
        ];
        for (const m of primaries) {
          bump(previstoMap, m, previstoSeries);
          bump(realizadoMap, m, realizadoSeries);
        }
        for (const m of auxiliaries) {
          bump(previstoMap, m, previstoSeries * 0.5);
          bump(realizadoMap, m, realizadoSeries * 0.5);
        }
      }

      const list: VolumeBar[] = Array.from(chosen)
        .map(m => ({
          muscle: m,
          previsto: Math.round((previstoMap.get(m) ?? 0) * 10) / 10,
          realizado: Math.round((realizadoMap.get(m) ?? 0) * 10) / 10,
        }))
        .sort((a, b) => b.previsto - a.previsto);
      setBars(list);
      setLoading(false);
    })();
  }, [weekStart.getTime(), weekEnd.getTime()]);

  const saveGroups = async (groups: string[]) => {
    const uid = await getCurrentUserId();
    if (!uid) return;
    await supabase.from("profiles").update({ stats_volume_grupos_padrao: groups }).eq("id", uid);
    setPreferredGroups(groups);
    setMuscles(new Set(groups.length ? groups : DEFAULT_MUSCLE_GROUPS));
  };

  return { bars, muscles, loading, allMusclesUniverse, preferredGroups, saveGroups };
}
