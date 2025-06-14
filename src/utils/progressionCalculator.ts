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
  isFirstWeek?: boolean; // Indica se é a primeira semana do exercício
}

export interface ProgressionResult {
  newWeight: number;
  newReps: string | number;
  newSets: number;
  progressionType: 'linear' | 'double';
  isDeload: boolean;
  reasoning: string;
  reps_programadas?: number; // Nova propriedade para armazenar reps programadas
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

// Função para buscar a pior série (menor repetições) executada no exercício
export const getWorstSeriesReps = async (exerciseId: string): Promise<number | null> => {
  try {
    const { data } = await supabase.rpc(
      'get_series_by_exercise',
      { exercise_id: exerciseId }
    );

    if (!data || data.length === 0) {
      return null;
    }

    // Encontrar a série com menor número de repetições (pior série)
    const worstSeries = data.reduce((worst, current) => {
      return current.repeticoes < worst.repeticoes ? current : worst;
    }, data[0]);

    return worstSeries.repeticoes;
  } catch (error) {
    console.error('Erro ao buscar pior série:', error);
    return null;
  }
};

// Função para buscar reps_programadas atual do exercício
export const getCurrentRepsProgramadas = async (exerciseId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('exercicios_treino_usuario')
      .select('reps_programadas')
      .eq('id', exerciseId)
      .single();

    if (error) {
      console.error('Erro ao buscar reps_programadas:', error);
      return null;
    }

    return data?.reps_programadas || null;
  } catch (error) {
    console.error('Erro ao buscar reps_programadas:', error);
    return null;
  }
};

// Calcular progressão linear (peso fixo, repetições fixas)
export const calculateLinearProgression = (
  currentWeight: number,
  executedReps: number,
  targetReps: number, // Reps programadas ou pior série (primeira semana)
  dificuldade: string,
  incrementoMinimo: number
): { newWeight: number, newReps: number, isDeload: boolean } => {
  console.log('Calculando progressão linear:', {
    currentWeight,
    executedReps,
    targetReps,
    dificuldade,
    incrementoMinimo
  });

  // Se o usuário conseguiu fazer as repetições programadas
  if (executedReps >= targetReps) {
    switch (dificuldade) {
      case 'muito_facil':
        return {
          newWeight: currentWeight + (incrementoMinimo * 2),
          newReps: targetReps,
          isDeload: false
        };
      case 'facil':
        return {
          newWeight: currentWeight + incrementoMinimo,
          newReps: targetReps,
          isDeload: false
        };
      case 'moderado':
        return {
          newWeight: currentWeight + incrementoMinimo,
          newReps: targetReps,
          isDeload: false
        };
      case 'dificil':
        return {
          newWeight: currentWeight,
          newReps: targetReps,
          isDeload: false
        };
      case 'muito_dificil':
        return {
          newWeight: Math.max(0, currentWeight - incrementoMinimo),
          newReps: targetReps,
          isDeload: true
        };
      default:
        return {
          newWeight: currentWeight,
          newReps: targetReps,
          isDeload: false
        };
    }
  } else {
    // Se não conseguiu fazer as repetições programadas, manter peso e tentar novamente
    return {
      newWeight: currentWeight,
      newReps: targetReps,
      isDeload: false
    };
  }
};

// Calcular progressão dupla (peso e repetições variam)
export const calculateDoubleProgression = (
  currentWeight: number,
  programmedReps: string, // Faixa de repetições programadas (ex: "8-12")
  executedReps: number, // Repetições executadas de fato (ex: 9)
  currentRepsProgramadas: number, // Repetições programadas atuais
  dificuldade: string,
  incrementoMinimo: number
): { newWeight: number, newReps: string, newRepsProgramadas: number, isDeload: boolean } => {
  console.log('Calculando progressão dupla:', {
    currentWeight,
    programmedReps,
    executedReps,
    currentRepsProgramadas,
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
        newReps: programmedReps, // Manter faixa
        newRepsProgramadas: min, // Resetar para mínimo da faixa
        isDeload: false
      };

    case 'facil':
      // Se conseguiu fazer próximo ao máximo da faixa, aumentar peso
      if (executedReps >= max - 1) {
        return {
          newWeight: currentWeight + incrementoMinimo,
          newReps: programmedReps, // Manter faixa
          newRepsProgramadas: min, // Resetar para mínimo da faixa
          isDeload: false
        };
      } else {
        // Tentar mais repetições primeiro
        return {
          newWeight: currentWeight,
          newReps: programmedReps, // Manter faixa
          newRepsProgramadas: Math.min(currentRepsProgramadas + 1, max), // Aumentar target
          isDeload: false
        };
      }

    case 'moderado':
      // Se conseguiu fazer no topo da faixa, aumentar peso
      if (executedReps >= max) {
        return {
          newWeight: currentWeight + incrementoMinimo,
          newReps: programmedReps, // Manter faixa
          newRepsProgramadas: min, // Resetar para mínimo da faixa
          isDeload: false
        };
      } else if (executedReps >= currentRepsProgramadas) {
        // Tentar mais repetições
        return {
          newWeight: currentWeight,
          newReps: programmedReps, // Manter faixa
          newRepsProgramadas: Math.min(currentRepsProgramadas + 1, max), // Aumentar target
          isDeload: false
        };
      } else {
        // Não conseguiu o target atual, manter tudo igual
        return {
          newWeight: currentWeight,
          newReps: programmedReps,
          newRepsProgramadas: currentRepsProgramadas, // Manter target atual
          isDeload: false
        };
      }

    case 'dificil':
      // Manter peso e repetições
      return {
        newWeight: currentWeight,
        newReps: programmedReps,
        newRepsProgramadas: currentRepsProgramadas, // Manter target atual
        isDeload: false
      };

    case 'muito_dificil':
      // Reduzir peso
      return {
        newWeight: Math.max(0, currentWeight - incrementoMinimo),
        newReps: programmedReps,
        newRepsProgramadas: Math.max(min, currentRepsProgramadas - 1), // Reduzir target
        isDeload: true
      };

    default:
      return {
        newWeight: currentWeight,
        newReps: programmedReps,
        newRepsProgramadas: currentRepsProgramadas,
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
    avaliacaoDor,
    isFirstWeek = false
  } = params;

  console.log('Calculando progressão com parâmetros:', params);

  // Determinar tipo de progressão baseado nas repetições programadas
  const useDoubleProgression = isDoubleProgression(programmedReps);
  
  let result: ProgressionResult;

  if (isFirstWeek) {
    // PRIMEIRA SEMANA: usar pior série como baseline e salvar em reps_programadas
    const worstSeriesReps = await getWorstSeriesReps(exerciseId);
    
    if (worstSeriesReps === null) {
      // Se não encontrou séries, usar valor padrão baseado no tipo de progressão
      const defaultReps = useDoubleProgression ? parseRepsRange(programmedReps).min : parseInt(programmedReps);
      
      result = {
        newWeight: currentWeight,
        newReps: useDoubleProgression ? programmedReps : defaultReps,
        newSets: currentSets,
        progressionType: useDoubleProgression ? 'double' : 'linear',
        isDeload: false,
        reasoning: 'Primeira semana - valor padrão usado (nenhuma série encontrada)',
        reps_programadas: defaultReps
      };
    } else {
      // Usar pior série como baseline para próximas semanas
      result = {
        newWeight: currentWeight,
        newReps: useDoubleProgression ? programmedReps : worstSeriesReps,
        newSets: currentSets,
        progressionType: useDoubleProgression ? 'double' : 'linear',
        isDeload: false,
        reasoning: `Primeira semana - baseline definido com base na pior série: ${worstSeriesReps} reps`,
        reps_programadas: worstSeriesReps
      };
    }
  } else {
    // SEMANAS SEGUINTES: usar reps_programadas como target
    const currentRepsProgramadas = await getCurrentRepsProgramadas(exerciseId);
    
    if (currentRepsProgramadas === null) {
      // Se não tem reps_programadas, tratar como primeira semana
      return calculateProgression({ ...params, isFirstWeek: true });
    }

    if (useDoubleProgression) {
      // Progressão dupla
      const progression = calculateDoubleProgression(
        currentWeight,
        programmedReps,
        executedReps,
        currentRepsProgramadas,
        avaliacaoDificuldade,
        incrementoMinimo
      );

      result = {
        newWeight: progression.newWeight,
        newReps: progression.newReps,
        newSets: currentSets,
        progressionType: 'double',
        isDeload: progression.isDeload,
        reasoning: `Progressão dupla aplicada. Target atual: ${currentRepsProgramadas} reps`,
        reps_programadas: progression.newRepsProgramadas
      };
    } else {
      // Progressão linear
      const progression = calculateLinearProgression(
        currentWeight,
        executedReps,
        currentRepsProgramadas,
        avaliacaoDificuldade,
        incrementoMinimo
      );

      result = {
        newWeight: progression.newWeight,
        newReps: progression.newReps,
        newSets: currentSets,
        progressionType: 'linear',
        isDeload: progression.isDeload,
        reasoning: `Progressão linear aplicada. Target: ${currentRepsProgramadas} reps`,
        reps_programadas: currentRepsProgramadas // Manter mesmo target na progressão linear
      };
    }
  }

  console.log('Resultado da progressão:', result);
  return result;
};

// Função para atualizar reps_programadas no banco
export const updateRepsProgramadas = async (exerciseId: string, repsProgramadas: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('exercicios_treino_usuario')
      .update({ reps_programadas: repsProgramadas })
      .eq('id', exerciseId);

    if (error) {
      console.error('Erro ao atualizar reps_programadas:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar reps_programadas:', error);
    return false;
  }
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
