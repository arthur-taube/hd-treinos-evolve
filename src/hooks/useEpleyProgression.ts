import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EpleyOption {
  weight: number;
  reps: number;
  estimated1RM: number;
  percentIncrease: number;
  label: 'mais fácil' | 'intermediário' | 'ideal' | 'mais difícil';
}

export interface EpleyResult {
  base: { weight: number; reps: number; estimated1RM: number };
  options: EpleyOption[];
  suggestedWeight: number;
  suggestedReps: number;
}

const TARGET_CENTER = 3.5;

function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  return weight * (1 + reps / 30);
}

function buildCandidates(
  prevWeight: number,
  prevReps: number,
  increment: number,
  minReps: number,
  maxReps: number,
  base1RM: number
): { weight: number; reps: number; estimated1RM: number; percentIncrease: number }[] {
  const weights = [prevWeight, prevWeight + increment];
  const candidates: { weight: number; reps: number; estimated1RM: number; percentIncrease: number }[] = [];

  for (const w of weights) {
    for (let r = minReps; r <= maxReps; r++) {
      // Exclude identical to base
      if (w === prevWeight && r === prevReps) continue;
      const est = epley1RM(w, r);
      const pct = ((est / base1RM) - 1) * 100;
      if (pct > 0) {
        candidates.push({ weight: w, reps: r, estimated1RM: est, percentIncrease: pct });
      }
    }
  }

  return candidates;
}

function filterByRange(
  candidates: { weight: number; reps: number; estimated1RM: number; percentIncrease: number }[],
  min: number,
  max: number
) {
  return candidates.filter(c => c.percentIncrease >= min && c.percentIncrease <= max);
}

function removeRedundant(
  candidates: { weight: number; reps: number; estimated1RM: number; percentIncrease: number }[]
): { weight: number; reps: number; estimated1RM: number; percentIncrease: number }[] {
  if (candidates.length <= 1) return candidates;

  // Sort by percentIncrease
  const sorted = [...candidates].sort((a, b) => a.percentIncrease - b.percentIncrease);
  const result: typeof sorted = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1];
    if (sorted[i].percentIncrease - last.percentIncrease < 1) {
      // Keep the one closer to 3.5%
      const lastDist = Math.abs(last.percentIncrease - TARGET_CENTER);
      const currDist = Math.abs(sorted[i].percentIncrease - TARGET_CENTER);
      if (currDist < lastDist) {
        result[result.length - 1] = sorted[i];
      }
    } else {
      result.push(sorted[i]);
    }
  }

  return result;
}

function labelOptions(options: { weight: number; reps: number; estimated1RM: number; percentIncrease: number }[]): EpleyOption[] {
  if (options.length === 0) return [];

  const sorted = [...options].sort((a, b) => a.percentIncrease - b.percentIncrease);
  
  if (sorted.length === 1) {
    return [{ ...sorted[0], label: 'ideal' }];
  }

  if (sorted.length === 2) {
    return [
      { ...sorted[0], label: 'mais fácil' },
      { ...sorted[1], label: 'mais difícil' },
    ];
  }

  // 3+: pick first, middle, last
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const midIdx = Math.floor(sorted.length / 2);
  const mid = sorted[midIdx];

  return [
    { ...first, label: 'mais fácil' },
    { ...mid, label: 'intermediário' },
    { ...last, label: 'mais difícil' },
  ];
}

function pickSuggested(options: EpleyOption[]): { weight: number; reps: number } {
  if (options.length === 0) return { weight: 0, reps: 0 };

  const ideal = options.find(o => o.label === 'ideal');
  if (ideal) return { weight: ideal.weight, reps: ideal.reps };

  // Closest to 3.5%
  const sorted = [...options].sort((a, b) => {
    const distA = Math.abs(a.percentIncrease - TARGET_CENTER);
    const distB = Math.abs(b.percentIncrease - TARGET_CENTER);
    if (Math.abs(distA - distB) < 0.01) return a.percentIncrease - b.percentIncrease; // tie → easier
    return distA - distB;
  });

  return { weight: sorted[0].weight, reps: sorted[0].reps };
}

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

      // Find most recent completed instance of this exercise in the same program
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

      const firstSet = seriesData.sort((a, b) => a.numero_serie - b.numero_serie)[0];
      const prevWeight = firstSet.peso;
      const prevReps = firstSet.repeticoes;

      if (prevWeight <= 0 && prevReps <= 0) {
        setResult(null);
        return;
      }

      const increment = incrementoMinimo || 2.5;
      const base1RM = epley1RM(prevWeight, prevReps);

      // Build candidate matrix
      const allCandidates = buildCandidates(prevWeight, prevReps, increment, minReps, maxReps, base1RM);

      // Filter: ideal first, then extended if no ideal candidates
      let filtered = filterByRange(allCandidates, 2, 5);
      if (filtered.length === 0) {
        filtered = filterByRange(allCandidates, 1, 6.5);
      }

      if (filtered.length === 0) {
        setResult(null);
        return;
      }

      // Remove redundant (<1pp difference)
      const deduped = removeRedundant(filtered);

      // Label
      const options = labelOptions(deduped);

      // Pick suggested for placeholder
      const suggested = pickSuggested(options);

      setResult({
        base: { weight: prevWeight, reps: prevReps, estimated1RM: Math.round(base1RM * 100) / 100 },
        options,
        suggestedWeight: suggested.weight,
        suggestedReps: suggested.reps,
      });
    } catch (error) {
      console.error('Error calculating Epley progression:', error);
      setResult(null);
    }
  };

  return result;
}
