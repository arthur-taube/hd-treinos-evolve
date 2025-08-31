
import { supabase } from "@/integrations/supabase/client";

export interface LastSeriesData {
  weight: number;
  reps: number;
}

export const getLastSeriesData = async (exerciseId: string): Promise<LastSeriesData | null> => {
  try {
    console.log('Getting last series data for exercise:', exerciseId);

    const { data } = await supabase.rpc(
      'get_series_by_exercise',
      { exercise_id: exerciseId }
    );

    if (!data || data.length === 0) {
      console.log('No series found for exercise');
      return null;
    }

    // Sort by numero_serie to get the last one
    const sortedSeries = data.sort((a, b) => b.numero_serie - a.numero_serie);
    const lastSeries = sortedSeries[0];

    console.log('Last series found:', lastSeries);

    return {
      weight: lastSeries.peso,
      reps: lastSeries.repeticoes
    };
  } catch (error) {
    console.error('Error getting last series data:', error);
    return null;
  }
};
