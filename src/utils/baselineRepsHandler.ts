
import { supabase } from "@/integrations/supabase/client";
import { getLastSeriesData } from "./lastSeriesHandler";

export const ensureBaselineReps = async (exerciseId: string): Promise<number | null> => {
  try {
    console.log('Ensuring baseline reps for exercise:', exerciseId);

    // Check if reps_programadas already exists
    const { data: exercise, error } = await supabase
      .from('exercicios_treino_usuario')
      .select('reps_programadas, repeticoes')
      .eq('id', exerciseId)
      .single();

    if (error) {
      console.error('Error fetching exercise for baseline reps:', error);
      return null;
    }

    if (exercise.reps_programadas !== null) {
      console.log('Exercise already has reps_programadas:', exercise.reps_programadas);
      return exercise.reps_programadas;
    }

    // Calculate baseline from last series
    const lastSeriesData = await getLastSeriesData(exerciseId);
    let baselineReps: number | null = null;

    if (lastSeriesData !== null) {
      baselineReps = lastSeriesData.reps;
      console.log('Using last series reps as baseline:', baselineReps);
    } else if (exercise.repeticoes) {
      // Parse repeticoes to get minimum value as fallback
      if (exercise.repeticoes.includes('-')) {
        baselineReps = parseInt(exercise.repeticoes.split('-')[0]);
      } else {
        baselineReps = parseInt(exercise.repeticoes);
      }
      console.log('Using minimum repeticoes as baseline fallback:', baselineReps);
    }

    // Save baseline reps_programadas if we have a value
    if (baselineReps !== null) {
      const { error: updateError } = await supabase
        .from('exercicios_treino_usuario')
        .update({ reps_programadas: baselineReps })
        .eq('id', exerciseId);

      if (updateError) {
        console.error('Error saving baseline reps_programadas:', updateError);
        return null;
      }

      console.log('Successfully saved baseline reps_programadas:', baselineReps);
      return baselineReps;
    }

    console.log('No baseline reps could be determined');
    return null;
  } catch (error) {
    console.error('Error in ensureBaselineReps:', error);
    return null;
  }
};
