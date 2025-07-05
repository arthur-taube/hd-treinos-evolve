
import { supabase } from '@/integrations/supabase/client';

export const updateMissingMuscleData = async (exerciseId: string, exercicioOriginalId: string): Promise<boolean> => {
  try {
    // Buscar dados musculares do exercício original
    const { data: exercicioOriginal, error } = await supabase
      .from('exercicios_iniciantes')
      .select('primary_muscle, secondary_muscle, video_url')
      .eq('id', exercicioOriginalId)
      .single();

    if (error || !exercicioOriginal) {
      console.error('Erro ao buscar exercício original:', error);
      return false;
    }

    // Atualizar dados musculares do exercício do usuário
    const { error: updateError } = await supabase
      .from('exercicios_treino_usuario')
      .update({
        primary_muscle: exercicioOriginal.primary_muscle,
        secondary_muscle: exercicioOriginal.secondary_muscle,
        video_url: exercicioOriginal.video_url
      })
      .eq('id', exerciseId);

    if (updateError) {
      console.error('Erro ao atualizar dados musculares:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro geral ao atualizar dados musculares:', error);
    return false;
  }
};

export const propagateIncrementoMinimo = async (
  exercicioOriginalId: string,
  programaUsuarioId: string,
  incrementoMinimo: number
): Promise<boolean> => {
  try {
    // Buscar todos os exercícios futuros com o mesmo exercicio_original_id no programa
    const { data: exerciciosFuturos, error } = await supabase
      .from('exercicios_treino_usuario')
      .select('id, treino_usuario_id')
      .eq('exercicio_original_id', exercicioOriginalId)
      .is('incremento_minimo', null);

    if (error) {
      console.error('Erro ao buscar exercícios futuros:', error);
      return false;
    }

    if (!exerciciosFuturos || exerciciosFuturos.length === 0) {
      return true; // Não há exercícios futuros para atualizar
    }

    // Filtrar apenas exercícios que pertencem ao mesmo programa
    const exerciciosDoPrograma = [];
    for (const exercicio of exerciciosFuturos) {
      const { data: treino } = await supabase
        .from('treinos_usuario')
        .select('programa_usuario_id')
        .eq('id', exercicio.treino_usuario_id)
        .single();

      if (treino && treino.programa_usuario_id === programaUsuarioId) {
        exerciciosDoPrograma.push(exercicio.id);
      }
    }

    if (exerciciosDoPrograma.length === 0) {
      return true; // Não há exercícios do mesmo programa para atualizar
    }

    // Atualizar incremento_minimo e configuracao_inicial para todos os exercícios futuros
    const { error: updateError } = await supabase
      .from('exercicios_treino_usuario')
      .update({ 
        incremento_minimo: incrementoMinimo,
        configuracao_inicial: true
      })
      .in('id', exerciciosDoPrograma);

    if (updateError) {
      console.error('Erro ao propagar incremento mínimo e configuracao_inicial:', updateError);
      return false;
    }

    console.log(`Incremento mínimo e configuracao_inicial propagados para ${exerciciosDoPrograma.length} exercícios futuros`);
    return true;
  } catch (error) {
    console.error('Erro geral ao propagar incremento mínimo:', error);
    return false;
  }
};
