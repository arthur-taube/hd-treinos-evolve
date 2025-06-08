
import { supabase } from '@/integrations/supabase/client';

export interface ProgressionParams {
  exerciseId: string;
  currentWeight: number;
  programmedReps: string; // Repetições programadas (pode ser faixa: "8-12")
  executedReps: number; // Repetições executadas de fato (número específico)
  currentSets: number;
  incrementoMinimo: number;
  avaliacaoDificuldade: string;
  avaliacaoFadiga?: number;
  avaliacaoDor?: number;
}

export interface ProgressionResult {
  newWeight: number;
  newReps: string | number;
  newSets: number;
  progressionType: 'linear' | 'double';
  isDeload: boolean;
  reasoning: string;
}

// Função para extrair min e max de uma faixa de repetições
export const parseRepsRange = (repsRange: string): { min: number, max: number } => {
  if (repsRange.includes('-')) {
    const [min, max] = repsRange.split('-').map(r => parseInt(r.trim()));
    return { min, max };
  }
  const reps = parseInt(repsRange);
  return { min: reps, max: reps };
};

// Função para determinar se um exercício usa progressão dupla
export const isDoubleProgression = (programmedReps: string): boolean => {
  return programmedReps.includes('-');
};

// Calcular progressão linear (peso fixo, repetições fixas)
export const calculateLinearProgression = (
  currentWeight: number,
  executedReps: number,
  programmedReps: number, // Número fixo de repetições programadas
  dificuldade: string,
  incrementoMinimo: number
): { newWeight: number, newReps: number, isDeload: boolean } => {
  console.log('Calculando progressão linear:', {
    currentWeight,
    executedReps,
    programmedReps,
    dificuldade,
    incrementoMinimo
  });

  // Se o usuário conseguiu fazer as repetições programadas
  if (executedReps >= programmedReps) {
    switch (dificuldade) {
      case 'muito_facil':
        return {
          newWeight: currentWeight + (incrementoMinimo * 2),
          newReps: programmedReps,
          isDeload: false
        };
      case 'facil':
        return {
          newWeight: currentWeight + incrementoMinimo,
          newReps: programmedReps,
          isDeload: false
        };
      case 'moderado':
        return {
          newWeight: currentWeight + incrementoMinimo,
          newReps: programmedReps,
          isDeload: false
        };
      case 'dificil':
        return {
          newWeight: currentWeight,
          newReps: programmedReps,
          isDeload: false
        };
      case 'muito_dificil':
        return {
          newWeight: Math.max(0, currentWeight - incrementoMinimo),
          newReps: programmedReps,
          isDeload: true
        };
      default:
        return {
          newWeight: currentWeight,
          newReps: programmedReps,
          isDeload: false
        };
    }
  } else {
    // Se não conseguiu fazer as repetições programadas, manter peso e tentar novamente
    return {
      newWeight: currentWeight,
      newReps: programmedReps,
      isDeload: false
    };
  }
};

// Calcular progressão dupla (peso e repetições variam)
export const calculateDoubleProgression = (
  currentWeight: number,
  programmedReps: string, // Faixa de repetições programadas (ex: "8-12")
  executedReps: number, // Repetições executadas de fato (ex: 9)
  dificuldade: string,
  incrementoMinimo: number
): { newWeight: number, newReps: string, isDeload: boolean } => {
  console.log('Calculando progressão dupla:', {
    currentWeight,
    programmedReps,
    executedReps,
    dificuldade,
    incrementoMinimo
  });

  const { min, max } = parseRepsRange(programmedReps);

  // Lógica de progressão dupla baseada na dificuldade e repetições executadas
  switch (dificuldade) {
    case 'muito_facil':
      // Se está muito fácil, aumentar peso significativamente
      return {
        newWeight: currentWeight + (incrementoMinimo * 2),
        newReps: `${min}-${max}`, // Manter faixa
        isDeload: false
      };

    case 'facil':
      // Se conseguiu fazer próximo ao máximo da faixa, aumentar peso
      if (executedReps >= max - 1) {
        return {
          newWeight: currentWeight + incrementoMinimo,
          newReps: `${min}-${max}`, // Manter faixa
          isDeload: false
        };
      } else {
        // Tentar mais repetições primeiro
        return {
          newWeight: currentWeight,
          newReps: `${Math.min(executedReps + 1, max)}-${max}`, // Aumentar mínimo da faixa
          isDeload: false
        };
      }

    case 'moderado':
      // Se conseguiu fazer no topo da faixa, aumentar peso
      if (executedReps >= max) {
        return {
          newWeight: currentWeight + incrementoMinimo,
          newReps: `${min}-${max}`, // Manter faixa
          isDeload: false
        };
      } else if (executedReps >= min) {
        // Tentar mais repetições
        return {
          newWeight: currentWeight,
          newReps: `${Math.min(executedReps + 1, max)}-${max}`,
          isDeload: false
        };
      } else {
        // Não conseguiu nem o mínimo, manter tudo igual
        return {
          newWeight: currentWeight,
          newReps: programmedReps,
          isDeload: false
        };
      }

    case 'dificil':
      // Manter peso e repetições
      return {
        newWeight: currentWeight,
        newReps: programmedReps,
        isDeload: false
      };

    case 'muito_dificil':
      // Reduzir peso
      return {
        newWeight: Math.max(0, currentWeight - incrementoMinimo),
        newReps: programmedReps,
        isDeload: true
      };

    default:
      return {
        newWeight: currentWeight,
        newReps: programmedReps,
        isDeload: false
      };
  }
};

// Função principal para calcular progressão
export const calculateProgression = async (params: ProgressionParams): Promise<ProgressionResult> => {
  const {
    exerciseId,
    currentWeight,
    programmedReps,
    executedReps,
    currentSets,
    incrementoMinimo,
    avaliacaoDificuldade,
    avaliacaoFadiga,
    avaliacaoDor
  } = params;

  console.log('Calculando progressão com parâmetros:', params);

  // Determinar tipo de progressão baseado nas repetições programadas
  const useDoubleProgression = isDoubleProgression(programmedReps);
  
  let result: ProgressionResult;

  if (useDoubleProgression) {
    // Progressão dupla
    const progression = calculateDoubleProgression(
      currentWeight,
      programmedReps,
      executedReps,
      avaliacaoDificuldade,
      incrementoMinimo
    );

    result = {
      newWeight: progression.newWeight,
      newReps: progression.newReps,
      newSets: currentSets, // Manter número de séries
      progressionType: 'double',
      isDeload: progression.isDeload,
      reasoning: `Progressão dupla aplicada baseada na dificuldade: ${avaliacaoDificuldade}`
    };
  } else {
    // Progressão linear
    const programmedRepsNum = parseInt(programmedReps);
    const progression = calculateLinearProgression(
      currentWeight,
      executedReps,
      programmedRepsNum,
      avaliacaoDificuldade,
      incrementoMinimo
    );

    result = {
      newWeight: progression.newWeight,
      newReps: progression.newReps,
      newSets: currentSets, // Manter número de séries
      progressionType: 'linear',
      isDeload: progression.isDeload,
      reasoning: `Progressão linear aplicada baseada na dificuldade: ${avaliacaoDificuldade}`
    };
  }

  console.log('Resultado da progressão:', result);
  return result;
};

// Função para buscar incremento mínimo de exercícios similares no programa
export const getIncrementoMinimo = async (
  exercicioOriginalId: string,
  programaUsuarioId: string
): Promise<number> => {
  try {
    const { data } = await supabase
      .from('exercicios_treino_usuario')
      .select('incremento_minimo')
      .eq('exercicio_original_id', exercicioOriginalId)
      .not('incremento_minimo', 'is', null)
      .limit(1);

    if (data && data.length > 0) {
      return data[0].incremento_minimo;
    }

    // Valor padrão se não encontrar
    return 2.5;
  } catch (error) {
    console.error('Erro ao buscar incremento mínimo:', error);
    return 2.5; // Valor padrão
  }
};

// Função para buscar a melhor série de exercícios anteriores
export const getBestExecutedReps = async (exerciseId: string): Promise<number | null> => {
  try {
    const { data } = await supabase.rpc(
      'get_series_by_exercise',
      { exercise_id: exerciseId }
    );

    if (!data || data.length === 0) {
      return null;
    }

    // Encontrar a melhor série (maior volume: peso * repetições)
    const bestSeries = data.reduce((best, current) => {
      const bestVolume = best.peso * best.repeticoes;
      const currentVolume = current.peso * current.repeticoes;
      return currentVolume > bestVolume ? current : best;
    }, data[0]);

    return bestSeries.repeticoes;
  } catch (error) {
    console.error('Erro ao buscar repetições executadas:', error);
    return null;
  }
};
