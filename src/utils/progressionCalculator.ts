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

// Função para buscar dados do exercício anterior
export const getPreviousExerciseData = async (exerciseId: string): Promise<{
  weight: number;
  reps: number;
  sets: number;
  repsProgramadas: number;
  avaliacaoDificuldade: string;
  avaliacaoFadiga: number;
  repeticoes: string;
} | null> => {
  try {
    // Buscar exercício atual e programa
    const { data: currentExercise } = await supabase
      .from('exercicios_treino_usuario')
      .select(`
        exercicio_original_id, 
        treino_usuario_id, 
        repeticoes,
        treinos_usuario!inner(programa_usuario_id)
      `)
      .eq('id', exerciseId)
      .single();

    if (!currentExercise) return null;

    const currentProgramaUsuarioId = currentExercise.treinos_usuario.programa_usuario_id;

    // Buscar exercício anterior no mesmo programa com JOIN
    const { data: previousExercises } = await supabase
      .from('exercicios_treino_usuario')
      .select(`
        id,
        peso, 
        series, 
        reps_programadas, 
        avaliacao_dificuldade, 
        avaliacao_fadiga, 
        repeticoes,
        updated_at,
        treinos_usuario!inner(programa_usuario_id)
      `)
      .eq('exercicio_original_id', currentExercise.exercicio_original_id)
      .eq('concluido', true)
      .eq('treinos_usuario.programa_usuario_id', currentProgramaUsuarioId)
      .neq('id', exerciseId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!previousExercises || previousExercises.length === 0) return null;

    const previousExercise = previousExercises[0];

    // Buscar melhor série executada do exercício anterior (usando o ID correto)
    const { data: series } = await supabase.rpc(
      'get_series_by_exercise',
      { exercise_id: previousExercise.id }
    );

    let bestReps = previousExercise.reps_programadas || 10;
    if (series && series.length > 0) {
      const bestSeries = series.reduce((best, current) => {
        const bestVolume = best.peso * best.repeticoes;
        const currentVolume = current.peso * current.repeticoes;
        return currentVolume > bestVolume ? current : best;
      }, series[0]);
      bestReps = bestSeries.repeticoes;
    }

    return {
      weight: previousExercise.peso || 0,
      reps: bestReps,
      sets: previousExercise.series || 3,
      repsProgramadas: previousExercise.reps_programadas || bestReps,
      avaliacaoDificuldade: previousExercise.avaliacao_dificuldade || 'moderado',
      avaliacaoFadiga: previousExercise.avaliacao_fadiga || 0,
      repeticoes: previousExercise.repeticoes || currentExercise.repeticoes || ''
    };
  } catch (error) {
    console.error('Erro ao buscar dados do exercício anterior:', error);
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
  previousRepsProgramadas: number,
  dificuldade: string
): number => {
  const { min, max } = parseRepsRange(repeticoes);
  const diffValue = getDifficultyValue(dificuldade);
  
  // Socorro! (Deload)
  if (diffValue === -2) {
    return Math.ceil(previousRepsProgramadas / 2);
  }
  
  // Casos normais
  let newReps = previousRepsProgramadas + diffValue;
  
  // Caso especial: muito fácil (+2)
  if (diffValue === 2) {
    // Calcular 1 unidade por vez
    let tempReps = previousRepsProgramadas + 1;
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

// Calcular novas séries usando apenas avaliação combinada (fadiga)
const calculateNewSets = (
  previousSets: number,
  dificuldade: string,
  avaliacaoFadiga: number = 0
): number => {
  const diffValue = getDifficultyValue(dificuldade);
  
  // Socorro! (Deload) - Regra superior
  if (diffValue === -2) {
    return previousSets / 2; // Retorna valor exato, incluindo decimais
  }
  
  // Regra atualizada: X = S + F (usando apenas a avaliação combinada)
  const newSets = previousSets + avaliacaoFadiga;
  
  // Retorna o valor exato (com decimais) - será salvo na database
  return Math.max(0.5, newSets); // Mínimo de 0.5 séries
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
    avaliacaoFadiga = 0,
    isFirstWeek = false
  } = params;

  console.log('Calculando progressão com algoritmo atualizado:', params);

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

  // Buscar dados do exercício anterior
  const previousData = await getPreviousExerciseData(exerciseId);
  if (!previousData) {
    // Se não encontrou dados anteriores, tratar como primeira semana
    return calculateProgression({ ...params, isFirstWeek: true });
  }

  const useDoubleProgression = isDoubleProgression(previousData.repeticoes);
  
  // Calcular novas séries primeiro (REGRA MAIOR) - usando apenas fadiga combinada
  const newSets = calculateNewSets(
    previousData.sets,
    avaliacaoDificuldade,
    avaliacaoFadiga
  );
  
  // Se séries aumentaram, manter peso e reps da semana anterior
  if (newSets > previousData.sets) {
    return {
      newWeight: previousData.weight,
      newReps: useDoubleProgression ? previousData.repeticoes : previousData.repsProgramadas,
      newSets: newSets, // Valor exato com decimais
      progressionType: useDoubleProgression ? 'double' : 'linear',
      isDeload: getDifficultyValue(avaliacaoDificuldade) === -2,
      reasoning: 'Séries aumentaram - mantendo peso e reps anteriores',
      reps_programadas: previousData.repsProgramadas
    };
  }

  // Calcular progressão normal
  if (useDoubleProgression) {
    const newRepsProgramadas = calculateDoubleProgressionReps(
      previousData.repeticoes,
      previousData.repsProgramadas,
      avaliacaoDificuldade
    );
    
    const newWeight = calculateDoubleProgressionWeight(
      previousData.weight,
      previousData.repsProgramadas,
      newRepsProgramadas,
      avaliacaoDificuldade,
      incrementoMinimo
    );

    return {
      newWeight: newWeight,
      newReps: previousData.repeticoes,
      newSets: newSets, // Valor exato com decimais
      progressionType: 'double',
      isDeload: getDifficultyValue(avaliacaoDificuldade) === -2,
      reasoning: 'Progressão dupla aplicada',
      reps_programadas: newRepsProgramadas
    };
  } else {
    // Progressão linear
    const diffValue = getDifficultyValue(avaliacaoDificuldade);
    let newWeight = previousData.weight;
    
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
      newReps: previousData.repsProgramadas,
      newSets: newSets, // Valor exato com decimais
      progressionType: 'linear',
      isDeload: diffValue === -2,
      reasoning: 'Progressão linear aplicada',
      reps_programadas: previousData.repsProgramadas
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
