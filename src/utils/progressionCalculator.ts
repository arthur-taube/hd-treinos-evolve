import { supabase } from '@/integrations/supabase/client';

export interface ProgressionParams {
  exerciseId: string;
  currentWeight: number;
  programmedReps: string;
  executedReps: number;
  currentSets: number;
  incrementoMinimo: number;
  avaliacaoDificuldade: string;
  avaliacaoFadiga?: number;
  isFirstWeek?: boolean;
  currentRepsProgramadas?: number;
}

export interface ProgressionResult {
  newWeight: number;
  newReps: string | number;
  newSets: number;
  progressionType: 'linear' | 'double';
  isDeload: boolean;
  reasoning: string;
  reps_programadas?: number;
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
export const isDoubleProgression = (repeticoes: string): boolean => {
  return repeticoes && repeticoes.includes('-');
};

// Função para buscar dados do exercício atual (para primeira semana ou fallback)
export const getCurrentExerciseData = async (exerciseId: string): Promise<{
  weight: number;
  reps: number;
  sets: number;
  repsProgramadas: number;
  avaliacaoDificuldade: string;
  avaliacaoFadiga: number;
  repeticoes: string;
  exerciseId: string;
} | null> => {
  try {
    console.log('Getting current exercise data for:', exerciseId);

    // Buscar exercício atual
    const { data: currentExercise, error } = await supabase
      .from('exercicios_treino_usuario')
      .select(`
        peso, 
        series, 
        reps_programadas, 
        avaliacao_dificuldade, 
        avaliacao_fadiga, 
        repeticoes
      `)
      .eq('id', exerciseId)
      .eq('concluido', true)
      .single();

    if (error || !currentExercise) {
      console.log('Current exercise not found or not completed:', error);
      return null;
    }

    // Get last series data for reps
    const { data: series } = await supabase.rpc(
      'get_series_by_exercise',
      { exercise_id: exerciseId }
    );

    let lastSeriesReps = currentExercise.reps_programadas || 10;
    if (series && series.length > 0) {
      const sortedSeries = series.sort((a, b) => b.numero_serie - a.numero_serie);
      lastSeriesReps = sortedSeries[0].repeticoes;
    }

    console.log('Using current exercise data:', {
      weight: currentExercise.peso || 0,
      reps: lastSeriesReps,
      sets: currentExercise.series || 3,
      repsProgramadas: currentExercise.reps_programadas || lastSeriesReps
    });

    return {
      weight: currentExercise.peso || 0,
      reps: lastSeriesReps,
      sets: currentExercise.series || 3,
      repsProgramadas: currentExercise.reps_programadas || lastSeriesReps,
      avaliacaoDificuldade: currentExercise.avaliacao_dificuldade || 'moderado',
      avaliacaoFadiga: currentExercise.avaliacao_fadiga || 0,
      repeticoes: currentExercise.repeticoes || '',
      exerciseId: exerciseId
    };
  } catch (error) {
    console.error('Erro ao buscar dados do exercício atual:', error);
    return null;
  }
};

// Mapear avaliações para valores numéricos
const getDifficultyValue = (dificuldade: string): number => {
  const mapping = {
    'muito_leve': 2,
    'bom': 1,
    'muito_pesado': 0,
    'errei_carga': -1,
    'socorro': -2
  };
  return mapping[dificuldade as keyof typeof mapping] || 0;
};

// Calcular nova carga com base na progressão dupla
const calculateDoubleProgressionWeight = (
  currentWeight: number,
  previousReps: number,
  newReps: number,
  dificuldade: string,
  incrementoMinimo: number
): number => {
  const diffValue = getDifficultyValue(dificuldade);
  
  // Caso especial -1: "Errei a carga"
  if (diffValue === -1) {
    const reduction1 = incrementoMinimo;
    const reduction2 = Math.max(1, Math.round(Math.abs(currentWeight) * 0.025));
    const reduction = Math.max(reduction1, reduction2);
    // Para pesos negativos, "reduzir carga" significa tornar mais negativo (mais fácil)
    return currentWeight >= 0 ? Math.max(0, currentWeight - reduction) : currentWeight - reduction;
  }
  
  // Caso especial -2: "Socorro!" (Deload)
  if (diffValue === -2) {
    const reduction1 = incrementoMinimo * 2;
    const reduction2 = Math.max(1, Math.round(Math.abs(currentWeight) * 0.04));
    const reduction = Math.min(reduction1, reduction2);
    // Para pesos negativos, deload significa tornar mais negativo (mais fácil)
    return currentWeight >= 0 ? Math.max(0, currentWeight - reduction) : currentWeight - reduction;
  }
  
  // Regra geral: Aumenta um incremento se as repetições diminuíram
  if (previousReps > newReps) {
    return currentWeight + incrementoMinimo;
  }
  
  return currentWeight;
};

// Calcular novas repetições para progressão dupla
const calculateDoubleProgressionReps = (
  repeticoes: string,
  currentRepsProgramadas: number,
  dificuldade: string
): number => {
  const { min, max } = parseRepsRange(repeticoes);
  const diffValue = getDifficultyValue(dificuldade);
  
  // Socorro! (Deload)
  if (diffValue === -2) {
    return Math.ceil(currentRepsProgramadas / 2);
  }
  
  // Casos normais
  let newReps = currentRepsProgramadas + diffValue;
  
  // Caso especial: muito fácil (+2)
  if (diffValue === 2) {
    // Calcular 1 unidade por vez
    let tempReps = currentRepsProgramadas + 1;
    if (tempReps > max) {
      return min;
    }
    tempReps += 1;
    if (tempReps > max) {
      return min;
    }
    newReps = tempReps;
  }
  
  // Regra geral: se ultrapassar max, volta para min
  if (newReps > max) {
    return min;
  }
  
  return Math.max(min, newReps);
};

// Calcular novas séries - usando apenas avaliacao_fadiga (combinada)
const calculateNewSets = (
  currentSets: number,
  dificuldade: string,
  avaliacaoFadiga: number = 0
): number => {
  const diffValue = getDifficultyValue(dificuldade);
  
  // Socorro! (Deload) - Regra superior
  if (diffValue === -2) {
    return currentSets / 2;
  }
  
  // Regra geral: X = S + F (apenas fadiga combinada, sem dor separada)
  const newSets = currentSets + avaliacaoFadiga;
  
  return Math.max(0.5, newSets);
};

// Função auxiliar para arredondar séries para exibição
export const roundSetsForDisplay = (sets: number): number => {
  const fractional = sets - Math.floor(sets);
  if (fractional <= 0.5) {
    return Math.floor(sets);
  } else {
    return Math.ceil(sets);
  }
};

// Função principal para calcular progressão - agora usa dados do exercício atual
export const calculateProgression = async (params: ProgressionParams): Promise<ProgressionResult> => {
  const {
    exerciseId,
    currentWeight,
    programmedReps,
    executedReps,
    currentSets,
    incrementoMinimo,
    avaliacaoDificuldade,
    avaliacaoFadiga = 0,
    isFirstWeek = false,
    currentRepsProgramadas
  } = params;

  console.log('Calculando progressão com dados atuais:', params);

  // Primeira semana: usar valores executados como baseline
  if (isFirstWeek) {
    const useDoubleProgression = isDoubleProgression(programmedReps);
    
    return {
      newWeight: currentWeight,
      newReps: useDoubleProgression ? programmedReps : executedReps,
      newSets: currentSets,
      progressionType: useDoubleProgression ? 'double' : 'linear',
      isDeload: false,
      reasoning: 'Primeira semana - baseline estabelecido',
      reps_programadas: executedReps
    };
  }

  // Para semanas seguintes: usar dados programados do dia atual
  const useDoubleProgression = isDoubleProgression(programmedReps);
  const actualRepsProgramadas = currentRepsProgramadas || executedReps;
  
  // Calcular novas séries usando dados atuais
  const newSets = calculateNewSets(
    currentSets,
    avaliacaoDificuldade,
    avaliacaoFadiga
  );
  
  // Se séries aumentaram, manter peso e reps do dia atual
  if (newSets > currentSets) {
    return {
      newWeight: currentWeight,
      newReps: useDoubleProgression ? programmedReps : actualRepsProgramadas,
      newSets: newSets,
      progressionType: useDoubleProgression ? 'double' : 'linear',
      isDeload: getDifficultyValue(avaliacaoDificuldade) === -2,
      reasoning: 'Séries aumentaram - mantendo peso e reps atuais',
      reps_programadas: actualRepsProgramadas
    };
  }

  // Calcular progressão normal baseada nos dados atuais
  if (useDoubleProgression) {
    const newRepsProgramadas = calculateDoubleProgressionReps(
      programmedReps,
      actualRepsProgramadas,
      avaliacaoDificuldade
    );
    
    const newWeight = calculateDoubleProgressionWeight(
      currentWeight,
      actualRepsProgramadas,
      newRepsProgramadas,
      avaliacaoDificuldade,
      incrementoMinimo
    );

    return {
      newWeight: newWeight,
      newReps: programmedReps,
      newSets: newSets,
      progressionType: 'double',
      isDeload: getDifficultyValue(avaliacaoDificuldade) === -2,
      reasoning: 'Progressão dupla aplicada com base nos dados atuais',
      reps_programadas: newRepsProgramadas
    };
  } else {
    // Progressão linear
    const diffValue = getDifficultyValue(avaliacaoDificuldade);
    let newWeight = currentWeight;
    
    if (diffValue === 2) {
      newWeight += incrementoMinimo * 2;
    } else if (diffValue === 1) {
      newWeight += incrementoMinimo;
    } else if (diffValue === -1) {
      // Para pesos negativos, "reduzir" significa tornar mais negativo
      newWeight = newWeight >= 0 ? Math.max(0, newWeight - incrementoMinimo) : newWeight - incrementoMinimo;
    } else if (diffValue === -2) {
      // Para pesos negativos, "reduzir" significa tornar mais negativo
      newWeight = newWeight >= 0 ? Math.max(0, newWeight - (incrementoMinimo * 2)) : newWeight - (incrementoMinimo * 2);
    }

    return {
      newWeight: newWeight,
      newReps: actualRepsProgramadas,
      newSets: newSets,
      progressionType: 'linear',
      isDeload: diffValue === -2,
      reasoning: 'Progressão linear aplicada com base nos dados atuais',
      reps_programadas: actualRepsProgramadas
    };
  }
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
