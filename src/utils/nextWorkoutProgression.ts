
import { supabase } from "@/integrations/supabase/client";
import { calculateProgression, getCurrentRepsProgramadas, getWorstSeriesReps } from "./progressionCalculator";

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

    // 3. Determine executed reps (use reps_programadas or worst series for first week)
    let executedReps = currentExercise.reps_programadas;
    
    if (!executedReps) {
      // First week case - use worst series as baseline
      const worstReps = await getWorstSeriesReps(data.currentExerciseId);
      if (worstReps !== null) {
        executedReps = worstReps;
      } else {
        console.log('No executed reps found, skipping precomputation');
        return;
      }
    }

    // 4. Check if this is first week for the current exercise
    const isFirstWeek = currentExercise.reps_programadas === null;

    // 5. Calculate progression using existing algorithm
    const progressionResult = await calculateProgression({
      exerciseId: data.currentExerciseId,
      currentWeight: currentExercise.peso || 0,
      programmedReps: currentExercise.repeticoes || "10",
      executedReps: executedReps,
      currentSets: currentExercise.series,
      incrementoMinimo: currentExercise.incremento_minimo || 2.5,
      avaliacaoDificuldade: data.avaliacaoDificuldade,
      avaliacaoFadiga: data.avaliacaoFadiga,
      isFirstWeek: isFirstWeek
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
