
import { supabase } from "@/integrations/supabase/client";
import { calculateProgression, getCurrentRepsProgramadas } from "./progressionCalculator";
import { updateMissingMuscleData } from "./muscleDataLoader";

interface ExerciseData {
  id: string;
  nome: string;
  exercicio_original_id: string;
  peso: number | null;
  repeticoes: string | null;
  series: number;
  reps_programadas: number | null;
  configuracao_inicial: boolean | null;
  primary_muscle: string | null;
  secondary_muscle: string | null;
}

export const applyWorkoutProgression = async (treinoId: string): Promise<void> => {
  try {
    console.log('Aplicando progressão automática para o treino:', treinoId);

    // Buscar todos os exercícios do treino
    const { data: exercicios, error: exerciciosError } = await supabase
      .from('exercicios_treino_usuario')
      .select('*')
      .eq('treino_usuario_id', treinoId);

    if (exerciciosError) {
      console.error('Erro ao buscar exercícios:', exerciciosError);
      return;
    }

    if (!exercicios || exercicios.length === 0) {
      console.log('Nenhum exercício encontrado para o treino');
      return;
    }

    // Buscar ID do programa
    const { data: treinoData } = await supabase
      .from('treinos_usuario')
      .select('programa_usuario_id')
      .eq('id', treinoId)
      .single();

    if (!treinoData) {
      console.error('Dados do treino não encontrados');
      return;
    }

    // Processar cada exercício
    for (const exercicio of exercicios) {
      await processExerciseProgression(exercicio, treinoData.programa_usuario_id);
    }

    console.log('Progressão automática aplicada com sucesso');
  } catch (error) {
    console.error('Erro ao aplicar progressão automática:', error);
  }
};

const processExerciseProgression = async (
  exercicio: ExerciseData,
  programaUsuarioId: string
): Promise<void> => {
  try {
    // Atualizar dados musculares se necessário
    if ((!exercicio.primary_muscle || !exercicio.secondary_muscle) && exercicio.exercicio_original_id) {
      await updateMissingMuscleData(exercicio.id, exercicio.exercicio_original_id);
    }

    // Se configuração inicial não foi feita, pular
    if (exercicio.configuracao_inicial !== true) {
      console.log(`Exercício ${exercicio.nome} ainda não teve configuração inicial`);
      return;
    }

    // Verificar se é primeira semana
    const currentRepsProgramadas = await getCurrentRepsProgramadas(exercicio.id);
    const isFirstWeek = currentRepsProgramadas === null;

    if (isFirstWeek) {
      console.log(`Primeira semana detectada para ${exercicio.nome} - não aplicando progressão`);
      return;
    }

    // Buscar dados do exercício anterior NO MESMO PROGRAMA com JOIN
    const { data: avaliacoesAnteriores } = await supabase
      .from('exercicios_treino_usuario')
      .select(`
        id,
        avaliacao_dificuldade, 
        avaliacao_fadiga, 
        peso, 
        series, 
        repeticoes, 
        incremento_minimo,
        treinos_usuario!inner(programa_usuario_id)
      `)
      .eq('exercicio_original_id', exercicio.exercicio_original_id)
      .eq('concluido', true)
      .eq('treinos_usuario.programa_usuario_id', programaUsuarioId)
      .neq('id', exercicio.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!avaliacoesAnteriores || avaliacoesAnteriores.length === 0) {
      console.log(`Nenhuma avaliação anterior encontrada para ${exercicio.nome} no programa ${programaUsuarioId}`);
      return;
    }

    const ultimaAvaliacao = avaliacoesAnteriores[0];

    // Se não há incremento_minimo definido, não aplicar progressão automática
    if (!ultimaAvaliacao.incremento_minimo || ultimaAvaliacao.incremento_minimo <= 0) {
      console.log(`Incremento mínimo não definido para ${exercicio.nome} - usuário deve configurar ao abrir exercício`);
      return;
    }

    // Buscar séries executadas anteriormente (usando o ID correto do exercício anterior)
    const { data: seriesAnteriores } = await supabase.rpc('get_series_by_exercise', {
      exercise_id: ultimaAvaliacao.id
    });
    
    let executedReps = 0;
    if (seriesAnteriores && seriesAnteriores.length > 0) {
      const bestSeries = seriesAnteriores.reduce((best, current) => {
        const bestVolume = best.peso * best.repeticoes;
        const currentVolume = current.peso * current.repeticoes;
        return currentVolume > bestVolume ? current : best;
      }, seriesAnteriores[0]);
      executedReps = bestSeries.repeticoes;
    }

    if (!ultimaAvaliacao.avaliacao_dificuldade || executedReps === 0) {
      console.log(`Dados insuficientes para progressão de ${exercicio.nome}`);
      return;
    }

    // Calcular progressão
    const progressao = await calculateProgression({
      exerciseId: exercicio.id,
      currentWeight: ultimaAvaliacao.peso || 0,
      programmedReps: ultimaAvaliacao.repeticoes || exercicio.repeticoes || "10",
      executedReps: executedReps,
      currentSets: ultimaAvaliacao.series || exercicio.series,
      incrementoMinimo: ultimaAvaliacao.incremento_minimo,
      avaliacaoDificuldade: ultimaAvaliacao.avaliacao_dificuldade,
      avaliacaoFadiga: ultimaAvaliacao.avaliacao_fadiga,
      isFirstWeek: false
    });

    // Atualizar exercício com novos valores
    const updates: any = {
      peso: progressao.newWeight,
      series: progressao.newSets
    };

    if (progressao.reps_programadas !== undefined) {
      updates.reps_programadas = progressao.reps_programadas;
    }

    const { error: updateError } = await supabase
      .from('exercicios_treino_usuario')
      .update(updates)
      .eq('id', exercicio.id);

    if (updateError) {
      console.error(`Erro ao atualizar exercício ${exercicio.nome}:`, updateError);
    } else {
      console.log(`Progressão aplicada para ${exercicio.nome}:`, progressao);
    }

  } catch (error) {
    console.error(`Erro ao processar exercício ${exercicio.nome}:`, error);
  }
};
