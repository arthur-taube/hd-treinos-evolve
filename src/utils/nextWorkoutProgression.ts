import { supabase } from "@/integrations/supabase/client";
import { calculateProgression, getCurrentRepsProgramadas } from "./progressionCalculator";
import { getLastSeriesData } from "./lastSeriesHandler";

interface ExerciseProgressionData {
  currentExerciseId: string;
  exercicioOriginalId: string | null;
  programaUsuarioId: string;
  avaliacaoDificuldade: string;
  avaliacaoFadiga: number;
  customExerciseId?: string | null;
}

export const precomputeNextExerciseProgression = async (data: ExerciseProgressionData): Promise<void> => {
  try {
    console.log('Starting precomputation for next exercise progression:', data);

    // 1. Get current exercise data including substituto_custom_id
    const { data: currentExercise, error: currentError } = await supabase
      .from('exercicios_treino_usuario')
      .select('peso, series, repeticoes, reps_programadas, incremento_minimo, substituto_custom_id')
      .eq('id', data.currentExerciseId)
      .single();

    if (currentError || !currentExercise) {
      console.error('Error fetching current exercise:', currentError);
      return;
    }

    // Determine which ID to use for finding next exercise
    const exercicioOriginalId = data.exercicioOriginalId;
    const customExerciseId = data.customExerciseId || currentExercise.substituto_custom_id;

    // 2. Find the next exercise instance
    const nextExercise = await findNextExerciseInstance(
      exercicioOriginalId, 
      data.programaUsuarioId,
      customExerciseId
    );

    if (!nextExercise) {
      console.log('No next exercise found, skipping precomputation');
      return;
    }

    console.log('Found next exercise instance:', nextExercise);

    // 3. Check if this is first week
    const isFirstWeek = await checkIsFirstWeekForProgram(
      exercicioOriginalId,
      data.programaUsuarioId,
      data.currentExerciseId,
      customExerciseId
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
  exercicioOriginalId: string | null,
  programaUsuarioId: string,
  currentExerciseId: string,
  customExerciseId?: string | null
): Promise<boolean> => {
  try {
    // Build query based on available identifiers
    let query = supabase
      .from('exercicios_treino_usuario')
      .select(`
        id,
        treino_usuario_id,
        treinos_usuario!inner(programa_usuario_id)
      `)
      .eq('concluido', true)
      .eq('treinos_usuario.programa_usuario_id', programaUsuarioId)
      .neq('id', currentExerciseId)
      .limit(1);

    // If we have exercicio_original_id, use it
    if (exercicioOriginalId) {
      query = query.eq('exercicio_original_id', exercicioOriginalId);
    } 
    // Otherwise, use substituto_custom_id for custom exercises
    else if (customExerciseId) {
      query = query.eq('substituto_custom_id', customExerciseId);
    } else {
      // No identifier available, assume first week
      console.log('No exercise identifier available, assuming first week');
      return true;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking first week:', error);
      return true;
    }

    const isFirstWeek = !data || data.length === 0;
    const identifier = exercicioOriginalId || customExerciseId;
    console.log(`Is first week for exercise ${identifier} in program ${programaUsuarioId}:`, isFirstWeek);
    return isFirstWeek;
  } catch (error) {
    console.error('Error in checkIsFirstWeekForProgram:', error);
    return true;
  }
};

const findNextExerciseInstance = async (
  exercicioOriginalId: string | null, 
  programaUsuarioId: string,
  customExerciseId?: string | null
): Promise<{ id: string; nome: string } | null> => {
  try {
    // Build query based on available identifiers
    let query = supabase
      .from('exercicios_treino_usuario')
      .select(`
        id, 
        nome, 
        created_at, 
        concluido,
        treino_usuario_id,
        treinos_usuario!inner(programa_usuario_id, created_at)
      `)
      .eq('treinos_usuario.programa_usuario_id', programaUsuarioId)
      .eq('concluido', false)
      .order('treinos_usuario(created_at)', { ascending: true });

    // If we have exercicio_original_id, use it
    if (exercicioOriginalId) {
      query = query.eq('exercicio_original_id', exercicioOriginalId);
    } 
    // Otherwise, use substituto_custom_id for custom exercises
    else if (customExerciseId) {
      query = query.eq('substituto_custom_id', customExerciseId);
    } else {
      // No identifier available, can't find next exercise
      console.log('No exercise identifier available, cannot find next exercise');
      return null;
    }

    const { data: exercises, error } = await query;

    if (error || !exercises || exercises.length === 0) {
      const identifier = exercicioOriginalId || customExerciseId;
      console.log(`No future exercises found for ${identifier}:`, error);
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
