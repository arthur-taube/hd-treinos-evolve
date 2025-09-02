import { supabase } from "@/integrations/supabase/client";
import { getLastSeriesData } from "./lastSeriesHandler";

// This function is now deprecated as baseline handling is done directly in useExerciseActions
// Keeping for backward compatibility but will be removed in future versions
export const ensureBaselineReps = async (exerciseId: string): Promise<number | null> => {
  console.log('ensureBaselineReps is deprecated - baseline handling moved to useExerciseActions');
  
  try {
    // Just return current reps_programadas if it exists
    const { data: exercise, error } = await supabase
      .from('exercicios_treino_usuario')
      .select('reps_programadas')
      .eq('id', exerciseId)
      .single();

    if (error) {
      console.error('Error fetching exercise for baseline reps:', error);
      return null;
    }

    return exercise.reps_programadas;
  } catch (error) {
    console.error('Error in ensureBaselineReps:', error);
    return null;
  }
};
