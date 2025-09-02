
import { supabase } from "@/integrations/supabase/client";
import { calculateProgression, getCurrentRepsProgramadas } from "./progressionCalculator";
import { getLastSeriesData } from "./lastSeriesHandler";

interface ExerciseProgressionData {
  currentExerciseId: string;
  exercicioOriginalId: string;
  programaUsuarioId: string;
  avaliacaoDificuldade: string;
  avaliacaoFadiga: number;
}

export const precomputeNextExerciseProgression = async (data: ExerciseProgressionData): Promise<void> => {
  try {
    console.log('Starting precomputation for next exercise progression:', data);

    // 1. Find the next exercise instance
    const nextExercise = await findNextExerciseInstance(
      data.exercicioOriginalId, 
      data.programaUsuarioId
    );

    if (!nextExercise) {
      console.log('No next exercise found, skipping precomputation');
      return;
    }

    console.log('Found next exercise instance:', nextExercise);

    // 2. Get current exercise data for progression calculation
    const { data: currentExercise, error: currentError } = await supabase
      .from('exercicios_treino_usuario')
      .select('peso, series, repeticoes, reps_programadas, incremento_minimo')
      .eq('id', data.currentExerciseId)
      .single();

    if (currentError || !currentExercise) {
      console.error('Error fetching current exercise:', currentError);
      return;
    }

    // 3. Check if this is first week
    const isFirstWeek = await checkIsFirstWeekForProgram(
      data.exercicioOriginalId,
      data.programaUsuarioId,
      data.currentExerciseId
    );

    // 4. Determine data to use for progression calculation
    let executedReps: number;
    let currentWeight: number;
    
    if (isFirstWeek) {
      console.log('First week - using last series data for baseline');
      // For first week only: use executed data from last series
      const lastSeriesData = await getLastSeriesData(data.currentExerciseId);
      if (lastSeriesData) {
        executedReps = lastSeriesData.reps;
        currentWeight = lastSeriesData.weight;
        console.log('Using last series data for first week:', lastSeriesData);
      } else {
        // Fallback to programmed values if no series data
        executedReps = currentExercise.reps_programadas || 10;
        currentWeight = currentExercise.peso || 0;
        console.log('Using fallback values for first week:', { executedReps, currentWeight });
      }
    } else {
      console.log('Not first week - using programmed values from database');
      // For subsequent weeks: use programmed values only
      executedReps = currentExercise.reps_programadas || 10;
      currentWeight = currentExercise.peso || 0;
      console.log('Using programmed values:', { executedReps, currentWeight });
    }

    // 5. Calculate progression using current exercise data
    const progressionResult = await calculateProgression({
      exerciseId: data.currentExerciseId,
      currentWeight: currentWeight,
      programmedReps: currentExercise.repeticoes || "10",
      executedReps: executedReps,
      currentSets: currentExercise.series,
      incrementoMinimo: currentExercise.incremento_minimo || 2.5,
      avaliacaoDificuldade: data.avaliacaoDificuldade,
      avaliacaoFadiga: data.avaliacaoFadiga,
      isFirstWeek: isFirstWeek,
      currentRepsProgramadas: currentExercise.reps_programadas
    });

    console.log('Calculated progression for next exercise:', progressionResult);

    // 6. Update next exercise with calculated values
    const updateData: any = {
      peso: progressionResult.newWeight,
      series: progressionResult.newSets
    };

    if (progressionResult.reps_programadas !== undefined) {
      updateData.reps_programadas = progressionResult.reps_programadas;
    }

    const { error: updateError } = await supabase
      .from('exercicios_treino_usuario')
      .update(updateData)
      .eq('id', nextExercise.id);

    if (updateError) {
      console.error('Error updating next exercise:', updateError);
    } else {
      console.log(`Successfully precomputed progression for next exercise ${nextExercise.nome}:`, updateData);
    }

  } catch (error) {
    console.error('Error in precomputeNextExerciseProgression:', error);
  }
};

const checkIsFirstWeekForProgram = async (
  exercicioOriginalId: string,
  programaUsuarioId: string,
  currentExerciseId: string
): Promise<boolean> => {
  try {
    // Check for previous completed exercises in the same program (excluding current)
    const { data, error } = await supabase
      .from('exercicios_treino_usuario')
      .select(`
        id,
        treino_usuario_id,
        treinos_usuario!inner(programa_usuario_id)
      `)
      .eq('exercicio_original_id', exercicioOriginalId)
      .eq('concluido', true)
      .eq('treinos_usuario.programa_usuario_id', programaUsuarioId)
      .neq('id', currentExerciseId)
      .limit(1);

    if (error) {
      console.error('Error checking first week:', error);
      return true;
    }

    const isFirstWeek = !data || data.length === 0;
    console.log(`Is first week for exercise ${exercicioOriginalId} in program ${programaUsuarioId}:`, isFirstWeek);
    return isFirstWeek;
  } catch (error) {
    console.error('Error in checkIsFirstWeekForProgram:', error);
    return true;
  }
};

const findNextExerciseInstance = async (
  exercicioOriginalId: string, 
  programaUsuarioId: string
): Promise<{ id: string; nome: string } | null> => {
  try {
    // Find all exercises with same exercicio_original_id in the same program
    const { data: exercises, error } = await supabase
      .from('exercicios_treino_usuario')
      .select(`
        id, 
        nome, 
        created_at, 
        concluido,
        treino_usuario_id,
        treinos_usuario!inner(programa_usuario_id, created_at)
      `)
      .eq('exercicio_original_id', exercicioOriginalId)
      .eq('treinos_usuario.programa_usuario_id', programaUsuarioId)
      .eq('concluido', false)
      .order('treinos_usuario(created_at)', { ascending: true });

    if (error || !exercises || exercises.length === 0) {
      console.log('No future exercises found:', error);
      return null;
    }

    // Return the first non-completed exercise (earliest by treino created_at)
    const nextExercise = exercises[0];
    return {
      id: nextExercise.id,
      nome: nextExercise.nome
    };

  } catch (error) {
    console.error('Error finding next exercise instance:', error);
    return null;
  }
};
