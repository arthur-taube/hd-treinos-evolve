
import { supabase } from '@/integrations/supabase/client';

export interface ProgressionInput {
  exerciseId: string;
  currentWeight: number;
  currentReps: string | number;
  currentSets: number;
  incrementoMinimo: number;
  avaliacaoDificuldade?: string;
  avaliacaoFadiga?: number;
  avaliacaoDor?: number;
}

export interface ProgressionOutput {
  newWeight: number;
  newReps: string | number;
  newSets: number;
  isDeload: boolean;
}

// Detectar se é progressão linear ou dupla
export const detectProgressionType = (reps: string | number): 'linear' | 'dupla' => {
  if (typeof reps === 'string' && reps.includes('-')) {
    return 'dupla';
  }
  return 'linear';
};

// Extrair faixa de repetições (ex: "8-12" -> {min: 8, max: 12})
export const parseRepsRange = (reps: string): {min: number, max: number} => {
  if (typeof reps === 'string' && reps.includes('-')) {
    const [min, max] = reps.split('-').map(Number);
    return { min, max };
  }
  return { min: Number(reps), max: Number(reps) };
};

// Calcular progressão de séries baseado em fadiga e dor
export const calculateSeriesProgression = (
  currentSets: number,
  fadiga: number = 0,
  dor: number = 0
): number => {
  const newSets = currentSets + fadiga + dor;
  // Arredondamento: até 0.51 para baixo
  return Math.floor(newSets + 0.49);
};

// Calcular progressão de carga (progressão linear)
export const calculateLinearProgression = (
  currentWeight: number,
  dificuldade: string,
  incrementoMinimo: number
): { newWeight: number, isDeload: boolean } => {
  let percentage = 0;
  let isDeload = false;

  switch (dificuldade) {
    case 'Muito Leve':
      percentage = 0.05; // +5%
      break;
    case 'Bom':
    case 'Pesado':
      percentage = 0.025; // +2.5%
      break;
    case 'Muito Pesado':
      percentage = 0; // Mantém
      break;
    case 'Errei na carga':
      percentage = -0.025; // -2.5%
      break;
    case 'Socorro, estagnei':
      percentage = -0.04; // -4%
      isDeload = true;
      break;
    default:
      percentage = 0;
  }

  const percentageChange = currentWeight * percentage;
  const minIncrementChange = incrementoMinimo * (percentage > 0 ? 1 : percentage < 0 ? -1 : 0);
  
  // Usar o maior entre percentual e incremento mínimo
  const change = Math.abs(percentageChange) > Math.abs(minIncrementChange) 
    ? percentageChange 
    : minIncrementChange;

  const rawNewWeight = currentWeight + change;
  
  // Arredondar para o incremento mínimo mais próximo
  const newWeight = Math.round(rawNewWeight / incrementoMinimo) * incrementoMinimo;
  
  return { 
    newWeight: Math.max(0, newWeight), 
    isDeload 
  };
};

// Calcular progressão dupla
export const calculateDoubleProgression = (
  currentWeight: number,
  currentReps: string,
  dificuldade: string,
  incrementoMinimo: number
): { newWeight: number, newReps: string, isDeload: boolean } => {
  const { min, max } = parseRepsRange(currentReps);
  const currentRepsNum = typeof currentReps === 'string' && currentReps.includes('-') 
    ? min // Assumir que está no mínimo se for faixa
    : Number(currentReps);
    
  let isDeload = false;
  let newWeight = currentWeight;
  let newRepsNum = currentRepsNum;

  switch (dificuldade) {
    case 'Muito Leve': {
      const increment = 2;
      if (currentRepsNum + increment <= max) {
        // Pode aumentar as repetições
        newRepsNum = currentRepsNum + increment;
      } else {
        // Precisa aumentar carga
        const unitsForWeight = Math.ceil((currentRepsNum + increment - max) / 1);
        const unitsForReps = increment - unitsForWeight;
        
        newWeight += incrementoMinimo * unitsForWeight;
        newRepsNum = min + unitsForReps;
      }
      break;
    }
    case 'Bom':
    case 'Pesado': {
      if (currentRepsNum + 1 <= max) {
        newRepsNum = currentRepsNum + 1;
      } else {
        newWeight += incrementoMinimo;
        newRepsNum = min;
      }
      break;
    }
    case 'Muito Pesado':
      // Mantém tudo igual
      break;
    case 'Errei na carga': {
      const { newWeight: calculatedWeight } = calculateLinearProgression(currentWeight, dificuldade, incrementoMinimo);
      newWeight = calculatedWeight;
      // Mantém repetições
      break;
    }
    case 'Socorro, estagnei': {
      const { newWeight: calculatedWeight } = calculateLinearProgression(currentWeight, dificuldade, incrementoMinimo);
      newWeight = calculatedWeight;
      newRepsNum = Math.floor(currentRepsNum / 2);
      isDeload = true;
      break;
    }
  }

  const newReps = `${min}-${max}`;
  return { newWeight, newReps, isDeload };
};

// Função principal de cálculo de progressão
export const calculateProgression = async (input: ProgressionInput): Promise<ProgressionOutput> => {
  const {
    currentWeight,
    currentReps,
    currentSets,
    incrementoMinimo,
    avaliacaoDificuldade,
    avaliacaoFadiga = 0,
    avaliacaoDor = 0
  } = input;

  // Calcular novas séries
  const newSets = calculateSeriesProgression(currentSets, avaliacaoFadiga, avaliacaoDor);
  
  // REGRA 1: Se séries aumentaram, manter carga e reps iguais
  if (newSets > currentSets) {
    return {
      newWeight: currentWeight,
      newReps: currentReps,
      newSets,
      isDeload: false
    };
  }

  // Se não há avaliação de dificuldade, manter valores atuais
  if (!avaliacaoDificuldade) {
    return {
      newWeight: currentWeight,
      newReps: currentReps,
      newSets: newSets,
      isDeload: false
    };
  }

  // Detectar tipo de progressão e calcular
  const progressionType = detectProgressionType(currentReps);
  
  if (progressionType === 'linear') {
    const { newWeight, isDeload } = calculateLinearProgression(
      currentWeight,
      avaliacaoDificuldade,
      incrementoMinimo
    );
    
    return {
      newWeight,
      newReps: currentReps,
      newSets: isDeload ? Math.max(2, Math.floor(newSets / 2)) : newSets,
      isDeload
    };
  } else {
    const { newWeight, newReps, isDeload } = calculateDoubleProgression(
      currentWeight,
      currentReps as string,
      avaliacaoDificuldade,
      incrementoMinimo
    );
    
    return {
      newWeight,
      newReps,
      newSets: isDeload ? Math.max(2, Math.floor(newSets / 2)) : newSets,
      isDeload
    };
  }
};

// Buscar incremento mínimo de exercícios anteriores do mesmo tipo
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
      .limit(1)
      .single();
      
    return data?.incremento_minimo || 1.0;
  } catch (error) {
    console.error('Erro ao buscar incremento mínimo:', error);
    return 1.0;
  }
};
