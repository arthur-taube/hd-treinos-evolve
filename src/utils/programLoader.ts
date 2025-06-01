
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/components/programs/ProgramEditor/types";

export interface LoadedProgramData {
  programName: string;
  programLevel: string;
  weeklyFrequency: number;
  mesocycles: number;
  programData: {
    duration: string;
    goals: string[];
    split: string;
  };
  exercisesPerDay: Record<string, Record<string, Exercise[]>>;
  savedSchedules: string[][];
  mesocycleDurations: number[];
}

export const loadExistingProgram = async (programId: string): Promise<LoadedProgramData | null> => {
  try {
    // 1. Carregar dados do programa
    const { data: programa, error: programaError } = await supabase
      .from('programas')
      .select('*')
      .eq('id', programId)
      .single();

    if (programaError || !programa) {
      throw new Error('Programa não encontrado');
    }

    // 2. Carregar mesociclos
    const { data: mesociclos, error: mesociclosError } = await supabase
      .from('mesociclos')
      .select('*')
      .eq('programa_id', programId)
      .order('numero');

    if (mesociclosError) {
      throw new Error('Erro ao carregar mesociclos');
    }

    // 3. Carregar treinos da primeira semana de cada mesociclo
    const exercisesPerDay: Record<string, Record<string, Exercise[]>> = {};
    const schedule: string[] = [];

    for (const mesociclo of mesociclos || []) {
      const { data: treinos, error: treinosError } = await supabase
        .from('treinos')
        .select('*')
        .eq('mesociclo_id', mesociclo.id)
        .eq('ordem_semana', 1) // Apenas primeira semana
        .order('dia_semana');

      if (treinosError) {
        continue;
      }

      const mesocycleKey = `mesocycle-${mesociclo.numero}`;
      exercisesPerDay[mesocycleKey] = {};

      for (const treino of treinos || []) {
        // Adicionar dia ao cronograma se ainda não existir
        if (!schedule.includes(treino.dia_semana)) {
          schedule.push(treino.dia_semana);
        }

        // 4. Carregar exercícios do treino
        const { data: exercicios, error: exerciciosError } = await supabase
          .from('exercicios_treino')
          .select('*')
          .eq('treino_id', treino.id)
          .order('ordem');

        if (exerciciosError) {
          continue;
        }

        const exercisesList: Exercise[] = (exercicios || []).map((ex, index) => ({
          id: `exercise-${ex.id}`,
          name: ex.nome,
          muscleGroup: ex.grupo_muscular,
          sets: ex.series,
          reps: ex.repeticoes || undefined,
          hidden: ex.oculto,
          allowMultipleGroups: ex.allow_multiple_groups || false,
          availableGroups: ex.available_groups || undefined
        }));

        exercisesPerDay[mesocycleKey][treino.dia_semana] = exercisesList;
      }
    }

    return {
      programName: programa.nome,
      programLevel: programa.nivel,
      weeklyFrequency: programa.frequencia_semanal,
      mesocycles: mesociclos?.length || 0,
      programData: {
        duration: `${programa.duracao_semanas} semanas`,
        goals: programa.objetivo || [],
        split: programa.split
      },
      exercisesPerDay,
      savedSchedules: schedule.length > 0 ? [schedule] : [],
      mesocycleDurations: (mesociclos || []).map(m => m.duracao_semanas)
    };

  } catch (error) {
    console.error('Error loading program:', error);
    return null;
  }
};
