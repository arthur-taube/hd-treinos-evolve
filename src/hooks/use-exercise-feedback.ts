import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { precomputeNextExerciseProgression } from "@/utils/nextWorkoutProgression";

// Constants for feedback options
export const DIFFICULTY_OPTIONS = [
  {
    value: "muito_leve",
    label: "Muito leve",
    description: "Foi fácil completar as repetições previstas para hoje."
  },
  {
    value: "bom",
    label: "Bom/Pesado", 
    description: "Foi difícil, mas consegui completar todas as repetições de hoje com técnica perfeita."
  },
  {
    value: "muito_pesado",
    label: "Muito pesado",
    description: "Técnica comprometida e/ou não consegui completar as repetições previstas para hoje."
  },
  {
    value: "errei_carga",
    label: "Errei a carga",
    description: "Escolhi uma carga muito pesada no início e agora não consigo progredir mais."
  },
  {
    value: "socorro",
    label: "Socorro!",
    description: "Já é a 2ª ou 3ª semana seguida que não consigo completar minhas repetições previstas."
  }
];

// Combined fatigue/pain evaluation - replaces both FATIGUE_OPTIONS and PAIN_OPTIONS
export const COMBINED_FATIGUE_OPTIONS = [
  {
    value: 1,
    label: "Nem parece que treinei",
    description: "Esse exercício não deixou meus músculos nem um pouco cansados hoje nem doloridos na semana passada."
  },
  {
    value: 0.75,
    label: "Foi moleza",
    description: "Esse exercício não deixou meus músculos cansados hoje, mas fiquei um pouco dolorido na semana passada."
  },
  {
    value: 0,
    label: "Esse pegou bem",
    description: "Eu senti uma boa/razoável fadiga muscular com esse exercício hoje e/ou tive alguma dor na semana passada."
  },
  {
    value: -0.25,
    label: "Foi sofrido",
    description: "Esse exercício causou uma boa fadiga muscular hoje e me deixou dolorido por vários dias na semana passada."
  },
  {
    value: -1,
    label: "Quase morri",
    description: "Esse exercício deixou meus músculos totalmente exaustos hoje e com uma dor muscular forte e prolongada na semana passada (chegando a afetar o treino seguinte)."
  }
];

export function useExerciseFeedback(exerciseId: string) {
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);
  const [showFatigueDialog, setShowFatigueDialog] = useState(false);
  const [showIncrementDialog, setShowIncrementDialog] = useState(false);
  
  const checkInitialConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('exercicios_treino_usuario')
        .select('configuracao_inicial, incremento_minimo')
        .eq('id', exerciseId)
        .single();
      
      if (error) throw error;
      
      // Only show dialog if incremento_minimo is null/undefined
      if (data && (data.incremento_minimo === null || data.incremento_minimo === undefined)) {
        console.log('Exercise needs increment configuration, showing dialog');
        setShowIncrementDialog(true);
        return true;
      }
      
      console.log('Exercise already has increment configuration, skipping dialog');
      return false;
      
    } catch (error: any) {
      console.error("Erro ao verificar configuração inicial:", error);
      return false;
    }
  };
  
  const saveDifficultyFeedback = async (difficulty: string) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({
          avaliacao_dificuldade: difficulty,
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', exerciseId);
      
      if (error) throw error;
      
      setShowDifficultyDialog(false);
      setShowFatigueDialog(true);
      
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const saveFatigueFeedback = async (fatigue: number) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({
          avaliacao_fadiga: fatigue,
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', exerciseId);
      
      if (error) throw error;
      
      setShowFatigueDialog(false);
      
      toast({
        title: "Avaliação salva",
        description: "Suas avaliações foram salvas com sucesso!"
      });

      // Trigger precomputation after both evaluations are saved
      await triggerProgressionPrecomputation(exerciseId, fatigue);
      
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const triggerProgressionPrecomputation = async (exerciseId: string, avaliacaoFadiga: number) => {
    try {
      // Get exercise data needed for precomputation
      const { data: exercise, error } = await supabase
        .from('exercicios_treino_usuario')
        .select(`
          exercicio_original_id,
          avaliacao_dificuldade,
          treino_usuario_id,
          treinos_usuario!inner(programa_usuario_id)
        `)
        .eq('id', exerciseId)
        .single();

      if (error || !exercise) {
        console.error('Error fetching exercise for precomputation:', error);
        return;
      }

      if (!exercise.avaliacao_dificuldade) {
        console.log('No difficulty evaluation found, skipping precomputation');
        return;
      }

      await precomputeNextExerciseProgression({
        currentExerciseId: exerciseId,
        exercicioOriginalId: exercise.exercicio_original_id,
        programaUsuarioId: exercise.treinos_usuario.programa_usuario_id,
        avaliacaoDificuldade: exercise.avaliacao_dificuldade,
        avaliacaoFadiga: avaliacaoFadiga
      });

    } catch (error) {
      console.error('Error triggering progression precomputation:', error);
    }
  };

  const saveIncrementSetting = async (increment: number) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({
          incremento_minimo: increment,
          configuracao_inicial: true
        })
        .eq('id', exerciseId);
      
      if (error) throw error;
      
      setShowIncrementDialog(false);
      
      toast({
        title: "Configuração salva",
        description: "Incremento mínimo configurado com sucesso!"
      });
      
    } catch (error: any) {
      toast({
        title: "Erro ao salvar configuração",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    showDifficultyDialog,
    setShowDifficultyDialog,
    showFatigueDialog,
    setShowFatigueDialog,
    showIncrementDialog,
    setShowIncrementDialog,
    saveDifficultyFeedback,
    saveFatigueFeedback,
    saveIncrementSetting,
    checkInitialConfiguration,
  };
}
