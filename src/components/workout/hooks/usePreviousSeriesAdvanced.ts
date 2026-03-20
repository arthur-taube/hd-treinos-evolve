import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PreviousSeriesAdvancedData {
  date: string;
  allSeries: {
    number: number;
    weight: number;
    reps: number;
    note?: string;
  }[];
}

export function usePreviousSeriesAdvanced(
  isOpen: boolean,
  exercicioOriginalId: string | null,
  cardOriginalId?: string | null,
  substitutoCustomId?: string | null
) {
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [previousSeries, setPreviousSeries] = useState<PreviousSeriesAdvancedData[]>([]);

  useEffect(() => {
    if (isOpen && (exercicioOriginalId || cardOriginalId || substitutoCustomId)) {
      fetchPreviousSeries();
    }
  }, [isOpen, exercicioOriginalId, cardOriginalId, substitutoCustomId]);

  const fetchPreviousSeries = async () => {
    setIsLoadingSeries(true);
    try {
      // Find exercises in the advanced table
      let currentQuery = supabase
        .from('exercicios_treino_usuario_avancado')
        .select('treino_usuario_id');

      if (cardOriginalId) {
        currentQuery = currentQuery.eq('card_original_id', cardOriginalId);
      } else if (exercicioOriginalId) {
        currentQuery = currentQuery.eq('exercicio_original_id', exercicioOriginalId);
      } else if (substitutoCustomId) {
        currentQuery = currentQuery.eq('substituto_custom_id', substitutoCustomId);
      }

      const { data: currentExercise } = await currentQuery
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!currentExercise) { setIsLoadingSeries(false); return; }

      const { data: currentWorkout } = await supabase
        .from('treinos_usuario')
        .select('programa_usuario_id')
        .eq('id', currentExercise.treino_usuario_id)
        .single();

      if (!currentWorkout) { setIsLoadingSeries(false); return; }

      let prevQuery = supabase
        .from('exercicios_treino_usuario_avancado')
        .select(`
          id, treino_usuario_id, updated_at,
          treinos_usuario!inner(programa_usuario_id)
        `)
        .eq('concluido', true)
        .eq('treinos_usuario.programa_usuario_id', currentWorkout.programa_usuario_id)
        .neq('treino_usuario_id', currentExercise.treino_usuario_id)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (cardOriginalId) {
        prevQuery = prevQuery.eq('card_original_id', cardOriginalId);
      } else if (exercicioOriginalId) {
        prevQuery = prevQuery.eq('exercicio_original_id', exercicioOriginalId);
      } else if (substitutoCustomId) {
        prevQuery = prevQuery.eq('substituto_custom_id', substitutoCustomId);
      }

      const { data: previousExercises } = await prevQuery;
      if (!previousExercises || previousExercises.length === 0) {
        setIsLoadingSeries(false);
        return;
      }

      // Get series for each exercise - note: series_exercicio_usuario FK points to exercicios_treino_usuario
      // For advanced exercises, we query series_exercicio_usuario directly by exercicio_usuario_id
      const seriesPromises = previousExercises.map(async ex => {
        const { data } = await supabase
          .from('series_exercicio_usuario')
          .select('*')
          .eq('exercicio_usuario_id', ex.id)
          .order('numero_serie', { ascending: true });
        return { exerciseId: ex.id, trainingId: ex.treino_usuario_id, series: data || [] };
      });

      const seriesResults = await Promise.all(seriesPromises);

      const trainingDatePromises = seriesResults.map(async result => {
        if (result.series.length === 0) return null;
        const { data } = await supabase
          .from('treinos_usuario')
          .select('data_concluido')
          .eq('id', result.trainingId)
          .single();
        if (!data?.data_concluido) return null;
        return {
          date: data.data_concluido,
          series: result.series
        };
      });

      const trainingResults = await Promise.all(trainingDatePromises);

      const formattedSeries = trainingResults
        .filter(r => r !== null)
        .slice(0, 1)
        .map(result => ({
          date: new Date(result!.date!).toLocaleDateString('pt-BR'),
          allSeries: result!.series.map((s, idx) => ({
            number: idx + 1,
            weight: s.peso,
            reps: s.repeticoes,
            note: s.nota || undefined
          }))
        }));

      setPreviousSeries(formattedSeries);
    } catch (error) {
      console.error("Error fetching previous series (advanced):", error);
    } finally {
      setIsLoadingSeries(false);
    }
  };

  return { isLoadingSeries, previousSeries };
}
