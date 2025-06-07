
import { supabase } from '@/integrations/supabase/client';

export interface MuscleData {
  primary_muscle?: string;
  secondary_muscle?: string;
}

// Buscar dados musculares de um exercício original
export const getMuscleData = async (exercicioOriginalId: string): Promise<MuscleData> => {
  try {
    const { data, error } = await supabase
      .from('exercicios_iniciantes')
      .select('primary_muscle, secondary_muscle')
      .eq('id', exercicioOriginalId)
      .single();
      
    if (error || !data) {
      console.error('Erro ao buscar dados musculares:', error);
      return {};
    }
    
    return {
      primary_muscle: data.primary_muscle,
      secondary_muscle: data.secondary_muscle
    };
  } catch (error) {
    console.error('Erro ao buscar dados musculares:', error);
    return {};
  }
};

// Atualizar exercícios que não têm dados musculares
export const updateMissingMuscleData = async (exercicioUsuarioId: string, exercicioOriginalId: string): Promise<boolean> => {
  try {
    const muscleData = await getMuscleData(exercicioOriginalId);
    
    if (muscleData.primary_muscle || muscleData.secondary_muscle) {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({
          primary_muscle: muscleData.primary_muscle,
          secondary_muscle: muscleData.secondary_muscle
        })
        .eq('id', exercicioUsuarioId);
        
      if (error) {
        console.error('Erro ao atualizar dados musculares:', error);
        return false;
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao atualizar dados musculares:', error);
    return false;
  }
};

// Propagar configurações de incremento mínimo para exercícios futuros
export const propagateIncrementoMinimo = async (
  exercicioOriginalId: string,
  programaUsuarioId: string,
  incrementoMinimo: number
): Promise<boolean> => {
  try {
    // Buscar todos os exercícios futuros do mesmo tipo no mesmo programa
    const { data: exerciciosFuturos } = await supabase
      .from('exercicios_treino_usuario')
      .select('id, treino_usuario_id')
      .eq('exercicio_original_id', exercicioOriginalId);
      
    if (!exerciciosFuturos) return false;
    
    // Filtrar apenas exercícios do mesmo programa
    const { data: treinosPrograma } = await supabase
      .from('treinos_usuario')
      .select('id')
      .eq('programa_usuario_id', programaUsuarioId);
      
    if (!treinosPrograma) return false;
    
    const treinoIds = treinosPrograma.map(t => t.id);
    const exerciciosParaAtualizar = exerciciosFuturos.filter(ex => 
      treinoIds.includes(ex.treino_usuario_id)
    );
    
    // Atualizar todos os exercícios do mesmo tipo no programa
    for (const exercicio of exerciciosParaAtualizar) {
      await supabase
        .from('exercicios_treino_usuario')
        .update({ incremento_minimo: incrementoMinimo })
        .eq('id', exercicio.id);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao propagar incremento mínimo:', error);
    return false;
  }
};
