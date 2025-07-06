
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SeriesData } from "./useExerciseState";

export function usePreviousSeries(isOpen: boolean, exercicioOriginalId: string) {
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [previousSeries, setPreviousSeries] = useState<SeriesData[]>([]);

  useEffect(() => {
    if (isOpen && exercicioOriginalId) {
      fetchPreviousSeries();
    }
  }, [isOpen, exercicioOriginalId]);

  const fetchPreviousSeries = async () => {
    setIsLoadingSeries(true);
    try {
      const { data: previousExercises, error: exercisesError } = await supabase
        .from('exercicios_treino_usuario')
        .select('id, treino_usuario_id')
        .eq('exercicio_original_id', exercicioOriginalId)
        .eq('concluido', true)
        .neq('id', exercicioOriginalId)
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
        .map(result => {
          if (!result!.series.length) return {
            date: new Date(result!.date!).toLocaleDateString('pt-BR'),
            weight: 0,
            reps: 0
          };
          
          const bestSeries = result!.series.reduce((best, current) => {
            const bestValue = best.peso * best.repeticoes;
            const currentValue = current.peso * current.repeticoes;
            return currentValue > bestValue ? current : best;
          }, result!.series[0]);
          
          return {
            date: new Date(result!.date!).toLocaleDateString('pt-BR'),
            weight: bestSeries ? bestSeries.peso : 0,
            reps: bestSeries ? bestSeries.repeticoes : 0
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
