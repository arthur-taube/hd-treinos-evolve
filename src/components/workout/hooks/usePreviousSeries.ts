
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SeriesData } from "./useExerciseState";

export function usePreviousSeries(isOpen: boolean, exercicioOriginalId: string, treinoUsuarioId: string) {
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [previousSeries, setPreviousSeries] = useState<SeriesData[]>([]);

  useEffect(() => {
    if (isOpen && exercicioOriginalId && treinoUsuarioId) {
      fetchPreviousSeries();
    }
  }, [isOpen, exercicioOriginalId, treinoUsuarioId]);

  const fetchPreviousSeries = async () => {
    setIsLoadingSeries(true);
    try {
      // Primeiro, buscar o programa_usuario_id do treino atual
      const { data: currentWorkout } = await supabase
        .from('treinos_usuario')
        .select('programa_usuario_id')
        .eq('id', treinoUsuarioId)
        .single();

      if (!currentWorkout) {
        setIsLoadingSeries(false);
        return;
      }

      const currentProgramaUsuarioId = currentWorkout.programa_usuario_id;

      // Buscar exercícios anteriores NO MESMO PROGRAMA com JOIN
      const { data: previousExercises, error: exercisesError } = await supabase
        .from('exercicios_treino_usuario')
        .select(`
          id, 
          treino_usuario_id,
          updated_at,
          treinos_usuario!inner(programa_usuario_id, data_concluido)
        `)
        .eq('exercicio_original_id', exercicioOriginalId)
        .eq('concluido', true)
        .eq('treinos_usuario.programa_usuario_id', currentProgramaUsuarioId)
        .neq('treino_usuario_id', treinoUsuarioId) // Excluir o treino atual
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
          return { 
            exerciseId: ex.id, 
            date: ex.treinos_usuario.data_concluido,
            series: [] 
          };
        }
        return { 
          exerciseId: ex.id, 
          date: ex.treinos_usuario.data_concluido,
          series: data || [] 
        };
      });

      const seriesResults = await Promise.all(seriesPromises);

      const formattedSeries = seriesResults
        .filter(result => result.date !== null && result.series.length > 0)
        .map(result => {
          const bestSeries = result.series.reduce((best, current) => {
            const bestValue = best.peso * best.repeticoes;
            const currentValue = current.peso * current.repeticoes;
            return currentValue > bestValue ? current : best;
          }, result.series[0]);
          
          return {
            date: new Date(result.date).toLocaleDateString('pt-BR'),
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
