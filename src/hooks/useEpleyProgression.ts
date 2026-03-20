import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EpleyResult {
  suggestedWeight: number;
  suggestedReps: number;
  message: string;
}

/**
 * Epley-based progression for advanced programs.
 * Uses 1RM = weight × (1 + reps/30) to estimate max.
 * "Greater or equal" method: if reps increase, load stays; if load increases, reps stay.
 * Suggestions stay within the given rep range.
 */
export function useEpleyProgression(
  exerciseId: string,
  exercicioOriginalId: string | null,
  cardOriginalId: string | null,
  treinoUsuarioId: string,
  repeticoes: string | null,
  incrementoMinimo: number | null
): EpleyResult | null {
  const [result, setResult] = useState<EpleyResult | null>(null);

  useEffect(() => {
    if (!exerciseId || !treinoUsuarioId) return;
    calculate();
  }, [exerciseId, treinoUsuarioId]);

  const calculate = async () => {
    try {
      // Parse rep range
      if (!repeticoes || !repeticoes.includes('-')) {
        setResult(null);
        return;
      }
      const [minReps, maxReps] = repeticoes.split('-').map(r => parseInt(r.trim()));
      if (isNaN(minReps) || isNaN(maxReps)) {
        setResult(null);
        return;
      }

      // Get current program
      const { data: currentWorkout } = await supabase
        .from('treinos_usuario')
        .select('programa_usuario_id')
        .eq('id', treinoUsuarioId)
        .single();

      if (!currentWorkout) { setResult(null); return; }

      // Find the most recent completed instance of this exercise in the same program
      let prevQuery = supabase
        .from('exercicios_treino_usuario_avancado')
        .select(`
          id,
          treino_usuario_id,
          treinos_usuario!inner(programa_usuario_id)
        `)
        .eq('concluido', true)
        .eq('treinos_usuario.programa_usuario_id', currentWorkout.programa_usuario_id)
        .neq('treino_usuario_id', treinoUsuarioId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (cardOriginalId) {
        prevQuery = prevQuery.eq('card_original_id', cardOriginalId);
      } else if (exercicioOriginalId) {
        prevQuery = prevQuery.eq('exercicio_original_id', exercicioOriginalId);
      }

      const { data: prevExercises } = await prevQuery;
      if (!prevExercises || prevExercises.length === 0) {
        setResult(null);
        return;
      }

      // Get series from previous exercise (first set)
      const { data: seriesData } = await supabase.rpc('get_series_by_exercise', {
        exercise_id: prevExercises[0].id
      });

      if (!seriesData || seriesData.length === 0) {
        setResult(null);
        return;
      }

      // Use first set for progression
      const firstSet = seriesData.sort((a, b) => a.numero_serie - b.numero_serie)[0];
      const prevWeight = firstSet.peso;
      const prevReps = firstSet.repeticoes;

      if (prevWeight <= 0 && prevReps <= 0) {
        setResult(null);
        return;
      }

      const increment = incrementoMinimo || 2.5;

      // Epley 1RM estimation
      const estimated1RM = prevWeight * (1 + prevReps / 30);

      // "Greater or equal" method:
      // Option A: Keep weight, increase reps by 1 (if within range)
      // Option B: Increase weight by increment, keep reps (if reps at max or would exceed range)
      
      let sugWeight = prevWeight;
      let sugReps = prevReps;
      let message = '';

      if (prevReps < maxReps) {
        // Can still increase reps within range
        sugWeight = prevWeight;
        sugReps = prevReps + 1;
        message = `Sugestão: ${sugWeight}kg x ${sugReps} reps (+1 rep)`;
      } else {
        // At max reps, increase load and reset to min reps
        sugWeight = prevWeight + increment;
        sugReps = minReps;
        message = `Sugestão: ${sugWeight}kg x ${sugReps} reps (+${increment}kg)`;
      }

      setResult({ suggestedWeight: sugWeight, suggestedReps: sugReps, message });
    } catch (error) {
      console.error('Error calculating Epley progression:', error);
      setResult(null);
    }
  };

  return result;
}
