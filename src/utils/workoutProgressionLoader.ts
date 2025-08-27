
import { supabase } from "@/integrations/supabase/client";
import { updateMissingMuscleData } from "./muscleDataLoader";

interface ExerciseData {
  id: string;
  nome: string;
  exercicio_original_id: string;
  peso: number | null;
  repeticoes: string | null;
  series: number;
  reps_programadas: number | null;
  configuracao_inicial: boolean | null;
  primary_muscle: string | null;
  secondary_muscle: string | null;
  incremento_minimo: number | null;
}

export const applyWorkoutProgression = async (treinoId: string): Promise<void> => {
  try {
    console.log('Checking muscle data for workout exercises:', treinoId);

    // Buscar todos os exercícios do treino
    const { data: exercicios, error: exerciciosError } = await supabase
      .from('exercicios_treino_usuario')
      .select('*')
      .eq('treino_usuario_id', treinoId);

    if (exerciciosError) {
      console.error('Erro ao buscar exercícios:', exerciciosError);
      return;
    }

    if (!exercicios || exercicios.length === 0) {
      console.log('Nenhum exercício encontrado para o treino');
      return;
    }

    // Only update muscle data if missing - progressions are now pre-calculated
    for (const exercicio of exercicios) {
      await processExerciseMuscleData(exercicio);
    }

    console.log('Muscle data check completed - progressions are pre-calculated');
  } catch (error) {
    console.error('Erro ao verificar dados dos exercícios:', error);
  }
};

const processExerciseMuscleData = async (exercicio: ExerciseData): Promise<void> => {
  try {
    // Atualizar dados musculares se necessário
    if ((!exercicio.primary_muscle || !exercicio.secondary_muscle) && exercicio.exercicio_original_id) {
      await updateMissingMuscleData(exercicio.id, exercicio.exercicio_original_id);
      console.log(`Updated muscle data for ${exercicio.nome}`);
    }
  } catch (error) {
    console.error(`Erro ao processar dados musculares de ${exercicio.nome}:`, error);
  }
};
