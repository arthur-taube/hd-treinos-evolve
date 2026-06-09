import { supabase } from "@/integrations/supabase/client";
import type { Exercise } from "@/components/programs/ProgramEditor/types";

/**
 * Deriva uma chave de identidade estável (consistente entre todas as semanas)
 * para casar exercícios editados com linhas do banco durante a propagação.
 * Cadeia: card_original_id -> exercicio_original_id -> nome::grupo.
 */
function getStableKey(row: {
  card_original_id?: string | null;
  exercicio_original_id?: string | null;
  nome?: string | null;
  grupo_muscular?: string | null;
}): string {
  if (row.card_original_id) return `card::${row.card_original_id}`;
  if (row.exercicio_original_id) return `orig::${row.exercicio_original_id}`;
  return `name::${row.nome || ''}::${row.grupo_muscular || ''}`;
}


interface FlexibleDesconsiderar {
  domingos: boolean;
  sabados: boolean;
  outros: string[];
}

interface CronogramaConfig {
  tipo: "recomendado" | "personalizado" | "flexivel";
  recomendadoIndex: number | null;
  personalizadoDias: string[];
  flexivelDiasTreino: number;
  flexivelDiasDescanso: number;
  flexivelDesconsiderar: FlexibleDesconsiderar;
}

interface LoadedProgramData {
  programData: any;
  programLevel?: string;
  mesocycleDurations: number[];
  weeklySchedules: string[][];
}

interface SaveCustomizedProgramParams {
  userId: string;
  programId: string;
  customName: string;
  startDate: Date;
  cronogramaConfig: CronogramaConfig;
  customExercises: Record<string, Exercise[]>;
  customDayTitles: Record<string, string>;
  programData: LoadedProgramData;
}

function getDayName(dayOfWeek: number): string {
  const days = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  return days[dayOfWeek];
}

function calculateFlexibleSchedule(
  startDate: Date,
  diasTreino: number,
  diasDescanso: number,
  desconsiderar: FlexibleDesconsiderar,
  totalSemanas: number
): Date[] {
  const scheduledDates: Date[] = [];
  let currentDate = new Date(startDate);
  const totalDays = totalSemanas * 7 * 2; // Buffer extra
  
  let treinoCount = 0;
  let descansoCount = 0;
  let daysProcessed = 0;
  
  while (daysProcessed < totalDays && scheduledDates.length < totalSemanas * diasTreino) {
    const dayOfWeek = currentDate.getDay();
    const dayName = getDayName(dayOfWeek);
    
    const isExcluded = 
      (desconsiderar.domingos && dayOfWeek === 0) ||
      (desconsiderar.sabados && dayOfWeek === 6) ||
      (desconsiderar.outros && desconsiderar.outros.includes(dayName));
    
    if (!isExcluded) {
      if (treinoCount < diasTreino) {
        scheduledDates.push(new Date(currentDate));
        treinoCount++;
      } else if (descansoCount < diasDescanso) {
        descansoCount++;
      }
      
      if (treinoCount === diasTreino && descansoCount === diasDescanso) {
        treinoCount = 0;
        descansoCount = 0;
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
    daysProcessed++;
  }
  
  return scheduledDates;
}

function buildCronogramaJson(
  config: CronogramaConfig,
  calculatedSchedule: Date[] | null
): any {
  if (config.tipo === "recomendado") {
    return {
      tipo: "recomendado",
      indice_cronograma: config.recomendadoIndex,
      dias: config.personalizadoDias,
    };
  } else if (config.tipo === "personalizado") {
    return {
      tipo: "personalizado",
      dias: config.personalizadoDias,
    };
  } else {
    return {
      tipo: "flexivel",
      dias_treino: config.flexivelDiasTreino,
      dias_descanso: config.flexivelDiasDescanso,
      desconsiderar: config.flexivelDesconsiderar,
      datas_calculadas: calculatedSchedule?.map(d => d.toISOString()),
    };
  }
}

function getDiaSemanaForWeek(
  ordemDia: number,
  semana: number,
  startDate: Date,
  config: CronogramaConfig,
  calculatedSchedule: Date[] | null
): string | null {
  if (config.tipo === "flexivel" && calculatedSchedule) {
    // Para cronograma flexível, usar as datas calculadas
    const workoutIndex = (semana - 1) * config.flexivelDiasTreino + (ordemDia - 1);
    if (workoutIndex < calculatedSchedule.length) {
      const date = calculatedSchedule[workoutIndex];
      return getDayName(date.getDay());
    }
    return null;
  } else {
    // Para recomendado e personalizado, usar os dias fixos
    const dias = config.personalizadoDias;
    if (ordemDia - 1 < dias.length) {
      return dias[ordemDia - 1];
    }
    return null;
  }
}

export async function saveCustomizedProgram(
  params: SaveCustomizedProgramParams
): Promise<string> {
  const {
    userId,
    programId,
    customName,
    startDate,
    cronogramaConfig,
    customExercises,
    customDayTitles,
    programData,
  } = params;

  // 1. Calcular dias de treino (para cronograma flexível)
  const totalWeeks = programData.mesocycleDurations.reduce((sum, dur) => sum + dur, 0);
  const calculatedSchedule =
    cronogramaConfig.tipo === "flexivel"
      ? calculateFlexibleSchedule(
          startDate,
          cronogramaConfig.flexivelDiasTreino,
          cronogramaConfig.flexivelDiasDescanso,
          cronogramaConfig.flexivelDesconsiderar,
          totalWeeks
        )
      : null;

  // 2. Desativar programas ativos
  await supabase
    .from("programas_usuario")
    .update({ ativo: false })
    .eq("usuario_id", userId)
    .eq("ativo", true);

  // 3. Criar programa do usuário
  const { data: programaUsuario, error: programError } = await supabase
    .from("programas_usuario")
    .insert({
      programa_original_id: programId,
      usuario_id: userId,
      ativo: true,
      nome_personalizado: customName,
      data_inicio: startDate.toISOString().split("T")[0],
      tipo_cronograma: cronogramaConfig.tipo,
      cronograma_dados: buildCronogramaJson(cronogramaConfig, calculatedSchedule),
    })
    .select()
    .single();

  if (programError) throw programError;

  // 4. Buscar apenas treinos da semana 1 (templates) do programa original
  const { data: treinosOriginais, error: treinosError } = await supabase
    .from("treinos")
    .select("*")
    .eq("programa_id", programId)
    .eq("ordem_semana", 1)
    .order("ordem_dia");

  if (treinosError) throw treinosError;

  // 5. Para cada treino, criar cópias para TODAS as semanas
  for (const treinoOriginal of treinosOriginais!) {
    for (let semana = 1; semana <= totalWeeks; semana++) {
      const diaSemana = getDiaSemanaForWeek(
        treinoOriginal.ordem_dia,
        semana,
        startDate,
        cronogramaConfig,
        calculatedSchedule
      );

      // Extrair nome customizado
      const dayKey = `day${treinoOriginal.ordem_dia}`;
      const customTitle = customDayTitles[dayKey];
      let nome = treinoOriginal.nome;
      let nomePersonalizado = treinoOriginal.nome_personalizado;

      if (customTitle) {
        if (customTitle.includes(" - ")) {
          [nome, nomePersonalizado] = customTitle.split(" - ").map((s) => s.trim());
        } else {
          nome = customTitle.trim();
          nomePersonalizado = null;
        }
      }

      // Criar treino do usuário
      const { data: treinoUsuario, error: treinoError } = await supabase
        .from("treinos_usuario")
        .insert({
          programa_usuario_id: programaUsuario.id,
          treino_original_id: treinoOriginal.id,
          nome: nome,
          nome_personalizado: nomePersonalizado,
          ordem_semana: semana,
          ordem_dia: treinoOriginal.ordem_dia,
          dia_semana: diaSemana,
        })
        .select()
        .single();

      if (treinoError) throw treinoError;

      // 6. Copiar exercícios customizados da semana 1 para todas as semanas
      const exerciciosDia = customExercises[dayKey] || [];
      const isAdvanced = programData.programLevel && programData.programLevel !== 'iniciante';

      if (exerciciosDia.length > 0) {
        if (isAdvanced) {
          // Insert into exercicios_treino_usuario_avancado for advanced programs
          const exerciciosAvancados = exerciciosDia
            .filter((exercicio) => !exercicio.hidden)
            .map((exercicio, index) => ({
              treino_usuario_id: treinoUsuario.id,
              exercicio_original_id: exercicio.id.startsWith("exercise-")
                ? null
                : (exercicio.originalId || null),
              nome: exercicio.name,
              grupo_muscular: exercicio.muscleGroup,
              series: exercicio.sets,
              repeticoes: exercicio.reps?.toString() || null,
              oculto: false,
              ordem: index + 1,
              card_original_id: exercicio.id.startsWith("exercise-") ? null : exercicio.id,
              rer: exercicio.rer || 'do_microciclo',
              metodo_especial: exercicio.specialMethod || null,
              modelo_feedback: exercicio.feedbackModel || 'ARA/ART',
            }));

          if (exerciciosAvancados.length > 0) {
            const { error: exerciciosError } = await supabase
              .from("exercicios_treino_usuario_avancado" as any)
              .insert(exerciciosAvancados);

            if (exerciciosError) throw exerciciosError;
          }
        } else {
          // Insert into exercicios_treino_usuario for beginner programs
          const exerciciosUsuario = exerciciosDia
            .filter((exercicio) => !exercicio.hidden)
            .map((exercicio, index) => ({
              treino_usuario_id: treinoUsuario.id,
              exercicio_original_id: exercicio.id.startsWith("exercise-")
                ? null
                : (exercicio.originalId || null),
              nome: exercicio.name,
              grupo_muscular: exercicio.muscleGroup,
              series: exercicio.sets,
              repeticoes: exercicio.reps?.toString() || null,
              oculto: false,
              ordem: index + 1,
              card_original_id: exercicio.id.startsWith("exercise-") ? null : exercicio.id,
            }));

          if (exerciciosUsuario.length > 0) {
            const { error: exerciciosError } = await supabase
              .from("exercicios_treino_usuario")
              .insert(exerciciosUsuario);

            if (exerciciosError) throw exerciciosError;
          }
        }
      }
    }
  }

  return programaUsuario.id;
}

interface UpdateUserProgramParams {
  programaUsuarioId: string;
  customName: string;
  customExercises: Record<string, Exercise[]>;
  customDayTitles: Record<string, string>;
  programLevel?: string;
}

/**
 * Atualiza um programa do usuário existente (programas_usuario)
 * Propaga alterações para treinos NÃO CONCLUÍDOS
 */
export async function updateUserProgram(
  params: UpdateUserProgramParams
): Promise<void> {
  const {
    programaUsuarioId,
    customName,
    customExercises,
    customDayTitles,
    programLevel,
  } = params;

  const isAdvanced = programLevel && programLevel !== 'iniciante';

  console.log('📝 updateUserProgram - Iniciando atualização:', programaUsuarioId);

  // 1. Atualizar nome personalizado do programa
  const { error: programError } = await supabase
    .from("programas_usuario")
    .update({ nome_personalizado: customName })
    .eq("id", programaUsuarioId);

  if (programError) throw programError;

  // 2. Buscar todos os treinos do usuário (para propagar alterações)
  const { data: allTreinos, error: treinosError } = await supabase
    .from("treinos_usuario")
    .select("*")
    .eq("programa_usuario_id", programaUsuarioId)
    .order("ordem_semana")
    .order("ordem_dia");

  if (treinosError) throw treinosError;

  // 3. Agrupar treinos por ordem_dia
  const treinosByDay: Record<number, typeof allTreinos> = {};
  allTreinos?.forEach(treino => {
    if (!treinosByDay[treino.ordem_dia]) {
      treinosByDay[treino.ordem_dia] = [];
    }
    treinosByDay[treino.ordem_dia].push(treino);
  });

  // 4. Para cada dia, atualizar títulos e exercícios
  for (const [dayKey, exercises] of Object.entries(customExercises)) {
    const ordemDia = parseInt(dayKey.replace('day', ''));
    const treinosDoDia = treinosByDay[ordemDia] || [];

    // Extrair nome e nome_personalizado do título
    const customTitle = customDayTitles[dayKey];
    let nome = '';
    let nomePersonalizado: string | null = null;

    if (customTitle) {
      if (customTitle.includes(" - ")) {
        [nome, nomePersonalizado] = customTitle.split(" - ").map(s => s.trim());
      } else {
        nome = customTitle.trim();
      }
    }

    // 4.1. Montar lista "desejada" (visível, em ordem) com chave estável (card_original_id).
    // Exercícios novos (sem card_original_id) recebem um id estável gerado, reutilizado em todas as semanas.
    const desired = exercises
      .filter(e => !e.hidden)
      .map((exercise) => {
        const existingCardId = (exercise as any).cardOriginalId || null;
        const isNew = !existingCardId;
        const cardOriginalId = existingCardId || crypto.randomUUID();
        const stableKey = getStableKey({
          card_original_id: cardOriginalId,
          exercicio_original_id: exercise.originalId || null,
          nome: exercise.name,
          grupo_muscular: exercise.muscleGroup,
        });
        return { exercise, cardOriginalId, stableKey, isNew };
      });

    // 5. Reconciliar cada treino do dia (todas as semanas não concluídas)
    for (const treino of treinosDoDia) {
      if (treino.concluido) continue; // Pular treinos já concluídos

      // Atualizar título do treino
      if (nome) {
        await supabase
          .from("treinos_usuario")
          .update({
            nome: nome,
            nome_personalizado: nomePersonalizado
          })
          .eq("id", treino.id);
      }

      const tableName = isAdvanced
        ? "exercicios_treino_usuario_avancado"
        : "exercicios_treino_usuario";

      const { data: exerciciosAtuais } = await supabase
        .from(tableName as any)
        .select("*")
        .eq("treino_usuario_id", treino.id)
        .order("ordem");

      const existingRows = (exerciciosAtuais as any[]) || [];

      // Linhas concluídas são histórico: nunca apagar/duplicar.
      const editableRows = existingRows.filter(r => !r.concluido);

      // Índice das linhas editáveis por chave estável (pode haver duplicatas legadas).
      const editableByKey = new Map<string, any[]>();
      for (const row of editableRows) {
        const key = getStableKey(row);
        const list = editableByKey.get(key) || [];
        list.push(row);
        editableByKey.set(key, list);
      }

      const matchedRowIds = new Set<string>();

      // Casar desejados <-> linhas editáveis por chave estável.
      for (let i = 0; i < desired.length; i++) {
        const { exercise, cardOriginalId, stableKey } = desired[i];
        const candidates = editableByKey.get(stableKey) || [];
        const match = candidates.find(c => !matchedRowIds.has(c.id));

        if (match) {
          matchedRowIds.add(match.id);
          const updatePayload: any = {
            nome: exercise.name,
            grupo_muscular: exercise.muscleGroup,
            series: exercise.sets,
            repeticoes: exercise.reps?.toString() || null,
            ordem: i + 1,
          };
          if (isAdvanced) {
            updatePayload.metodo_especial = exercise.specialMethod || null;
            updatePayload.rer = exercise.rer || 'do_microciclo';
            updatePayload.modelo_feedback = exercise.feedbackModel || 'ARA/ART';
          }
          await supabase
            .from(tableName as any)
            .update(updatePayload)
            .eq("id", match.id);
        } else {
          // Inserir novo (ou movido para este dia).
          const insertPayload: any = {
            treino_usuario_id: treino.id,
            exercicio_original_id: exercise.originalId || null,
            nome: exercise.name,
            grupo_muscular: exercise.muscleGroup,
            series: exercise.sets,
            repeticoes: exercise.reps?.toString() || null,
            oculto: false,
            ordem: i + 1,
            card_original_id: cardOriginalId,
          };
          if (isAdvanced) {
            insertPayload.rer = exercise.rer || 'do_microciclo';
            insertPayload.metodo_especial = exercise.specialMethod || null;
            insertPayload.modelo_feedback = exercise.feedbackModel || 'ARA/ART';
          }
          await supabase
            .from(tableName as any)
            .insert(insertPayload);
        }
      }

      // Remover linhas editáveis não casadas (movidas para outro dia, ocultadas ou duplicatas).
      const rowsToDelete = editableRows
        .filter(r => !matchedRowIds.has(r.id))
        .map(r => r.id);

      if (rowsToDelete.length > 0) {
        await supabase
          .from(tableName as any)
          .delete()
          .in("id", rowsToDelete);
      }
    }
  }

  console.log('✅ updateUserProgram - Atualização concluída');
}
