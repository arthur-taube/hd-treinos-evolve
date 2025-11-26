import { supabase } from "@/integrations/supabase/client";
import type { Exercise } from "@/components/programs/ProgramEditor/types";

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

  // 4. Buscar todos os treinos do programa original
  const { data: treinosOriginais, error: treinosError } = await supabase
    .from("treinos")
    .select("*")
    .eq("programa_id", programId)
    .order("ordem_semana")
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

      if (exerciciosDia.length > 0) {
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
            ordem: index,
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

  return programaUsuario.id;
}
