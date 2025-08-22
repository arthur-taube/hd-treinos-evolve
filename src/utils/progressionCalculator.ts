import { supabase } from "@/integrations/supabase/client";

interface ProgressionParams {
  exerciseId: string;
  currentWeight: number;
  programmedReps: string;
  executedReps: number;
  currentSets: number;
  incrementoMinimo: number | null | undefined;
  avaliacaoDificuldade: string | null;
  avaliacaoFadiga: number;
  isFirstWeek: boolean;
}

interface ProgressionResult {
  newWeight: number;
  newSets: number;
  reps_programadas?: number;
}

export const calculateProgression = async (params: ProgressionParams): Promise<ProgressionResult> => {
  console.log(`Starting progression calculation for exercise ${params.exerciseId}`);
  console.log(`Progression parameters:`, params);

  let newWeight = params.currentWeight;
  let newSets = params.currentSets;
  let repsProgramadas: number | undefined = undefined;

  try {
    // Validate required parameters
    if (!params.incrementoMinimo || params.incrementoMinimo <= 0) {
      console.warn(`Incremento mínimo inválido (${params.incrementoMinimo}), retornando valores atuais.`);
      return { newWeight, newSets };
    }

    // Convert programmedReps to a number or a range
    let minReps: number, maxReps: number;
    if (params.programmedReps.includes('-')) {
      [minReps, maxReps] = params.programmedReps.split('-').map(Number);
    } else {
      minReps = maxReps = parseInt(params.programmedReps);
    }

    // Check if executedReps is within the programmed range
    const repsAchieved = params.executedReps >= minReps && params.executedReps <= maxReps;

    if (params.isFirstWeek) {
      console.log(`First week progression logic`);
      
      // If it's the first week, focus on achieving the minimum reps
      if (params.executedReps >= minReps) {
        // If minimum reps are achieved, increase weight
        newWeight = params.currentWeight + params.incrementoMinimo;
        repsProgramadas = minReps; // Set reps_programadas to minReps
        console.log(`First week: reps achieved, increasing weight to ${newWeight}, reps_programadas set to ${repsProgramadas}`);
      } else {
        // If minimum reps are not achieved, maintain weight and set reps_programadas
        newWeight = params.currentWeight;
        repsProgramadas = Math.max(minReps - 2, 1); // Try to get closer to minReps
        console.log(`First week: reps not achieved, maintaining weight at ${newWeight}, reps_programadas adjusted to ${repsProgramadas}`);
      }
    } else {
      console.log(`Subsequent week progression logic`);

      // If reps were achieved, increase weight
      if (repsAchieved) {
        newWeight = params.currentWeight + params.incrementoMinimo;
        repsProgramadas = minReps; // Set reps_programadas to minReps
        console.log(`Reps achieved, increasing weight to ${newWeight}, reps_programadas set to ${repsProgramadas}`);
      } else {
        // If reps were not achieved, decrease weight
        newWeight = Math.max(0, params.currentWeight - params.incrementoMinimo);
        repsProgramadas = Math.max(minReps - 2, 1); // Try to get closer to minReps
        console.log(`Reps not achieved, decreasing weight to ${newWeight}, reps_programadas adjusted to ${repsProgramadas}`);
      }
    }

    console.log(`Progression calculation complete. New weight: ${newWeight}, reps_programadas: ${repsProgramadas}`);
    return { newWeight, newSets, reps_programadas: repsProgramadas };

  } catch (error) {
    console.error("Erro ao calcular progressão:", error);
    return { newWeight, newSets };
  }
};

export const getCurrentRepsProgramadas = async (exerciseId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('exercicios_treino_usuario')
      .select('reps_programadas')
      .eq('id', exerciseId)
      .single();

    if (error) {
      console.error('Error fetching reps_programadas:', error);
      return null;
    }

    return data ? data.reps_programadas : null;
  } catch (error) {
    console.error('Error in getCurrentRepsProgramadas:', error);
    return null;
  }
};

export const updateRepsProgramadas = async (exerciseId: string, repsProgramadas: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('exercicios_treino_usuario')
      .update({ reps_programadas: repsProgramadas })
      .eq('id', exerciseId);

    if (error) {
      console.error('Error updating reps_programadas:', error);
    } else {
      console.log(`Successfully updated reps_programadas to ${repsProgramadas} for exercise ${exerciseId}`);
    }
  } catch (error) {
    console.error('Error in updateRepsProgramadas:', error);
  }
};

export const getWorstSeriesReps = async (exerciseId: string): Promise<number | null> => {
  try {
    console.log(`Getting worst series reps for exercise: ${exerciseId}`);
    
    const { data, error } = await supabase.rpc('get_series_by_exercise', {
      exercise_id: exerciseId
    });
    
    if (error) {
      console.error('Error fetching series for worst reps:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('No series found for exercise');
      return null;
    }
    
    // Find the series with the lowest reps (worst performance)
    const worstSeries = data.reduce((worst, current) => {
      return current.repeticoes < worst.repeticoes ? current : worst;
    }, data[0]);
    
    console.log(`Worst series found:`, worstSeries);
    return worstSeries.repeticoes;
    
  } catch (error) {
    console.error('Exception in getWorstSeriesReps:', error);
    return null;
  }
};
