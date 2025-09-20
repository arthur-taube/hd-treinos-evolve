
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SeriesData } from "./useExerciseState";

export interface PreviousSeriesData {
  date: string;
  allSeries: {
    number: number;
    weight: number;
    reps: number;
  }[];
  nota?: string;
}

export function usePreviousSeries(isOpen: boolean, exercicioOriginalId: string) {
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [previousSeries, setPreviousSeries] = useState<PreviousSeriesData[]>([]);

  useEffect(() => {
    if (isOpen && exercicioOriginalId) {
      fetchPreviousSeries();
    }
  }, [isOpen, exercicioOriginalId]);

  const fetchPreviousSeries = async () => {
    setIsLoadingSeries(true);
    try {
      // First get current exercise to determine its program
      const { data: currentExercise, error: currentError } = await supabase
        .from('exercicios_treino_usuario')
        .select('treino_usuario_id')
        .eq('exercicio_original_id', exercicioOriginalId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (currentError || !currentExercise) {
        console.error('Error fetching current exercise:', currentError);
        setIsLoadingSeries(false);
        return;
      }

      // Get current program
      const { data: currentWorkout, error: workoutError } = await supabase
        .from('treinos_usuario')
        .select('programa_usuario_id')
        .eq('id', currentExercise.treino_usuario_id)
        .single();

      if (workoutError || !currentWorkout) {
        console.error('Error fetching current workout:', workoutError);
        setIsLoadingSeries(false);
        return;
      }

      // Get previous exercises from same program
      const { data: previousExercises, error: exercisesError } = await supabase
        .from('exercicios_treino_usuario')
        .select(`
          id, 
          treino_usuario_id,
          updated_at,
          treinos_usuario!inner(programa_usuario_id)
        `)
        .eq('exercicio_original_id', exercicioOriginalId)
        .eq('concluido', true)
        .eq('treinos_usuario.programa_usuario_id', currentWorkout.programa_usuario_id)
        .neq('treino_usuario_id', currentExercise.treino_usuario_id)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (exercisesError) throw exercisesError;
      if (!previousExercises || previousExercises.length === 0) {
        setIsLoadingSeries(false);
        return;
      }

      const seriesPromises = previousExercises.map(async ex => {
        const { data, error } = await supabase.rpc('get_series_by_exercise', {
          exercise_id: ex.id
        });
        if (error) {
          console.error("Error fetching series:", error);
          return { exerciseId: ex.id, trainingId: ex.treino_usuario_id, series: [] };
        }
        return { exerciseId: ex.id, trainingId: ex.treino_usuario_id, series: data || [] };
      });

      const seriesResults = await Promise.all(seriesPromises);

      const trainingDatePromises = seriesResults.map(async result => {
        if (result.series.length === 0) return null;
        const { data, error } = await supabase
          .from('treinos_usuario')
          .select('data_concluido')
          .eq('id', result.trainingId)
          .single();
        if (error) return null;
        return {
          exerciseId: result.exerciseId,
          date: data?.data_concluido || null,
          series: result.series
        };
      });

      const trainingResults = await Promise.all(trainingDatePromises);

      const formattedSeries = trainingResults
        .filter(result => result !== null && result.date !== null)
        .slice(0, 1) // Only get the most recent workout
        .map(result => {
          if (!result!.series.length) return {
            date: new Date(result!.date!).toLocaleDateString('pt-BR'),
            allSeries: []
          };
          
          // Return all series instead of just the best one
          const allSeries = result!.series.map((series, index) => ({
            number: index + 1,
            weight: series.peso,
            reps: series.repeticoes
          }));

          // Check if any series has a note
          const seriesWithNote = result!.series.find((s: any) => s.nota);
          const nota = seriesWithNote?.nota;
          
          return {
            date: new Date(result!.date!).toLocaleDateString('pt-BR'),
            allSeries,
            nota
          };
        });

      setPreviousSeries(formattedSeries);
    } catch (error) {
      console.error("Erro ao buscar séries anteriores:", error);
    } finally {
      setIsLoadingSeries(false);
    }
  };

  return { isLoadingSeries, previousSeries };
}
