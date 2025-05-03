
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Constants for feedback options
export const DIFFICULTY_OPTIONS = [
  {
    value: "muito_leve",
    label: "Muito leve",
    description: "Este exercício estava muito fácil, conseguiria fazer mais repetições ou adicionar mais peso."
  },
  {
    value: "bom",
    label: "Bom/Pesado",
    description: "Este exercício estava no peso ideal, consegui completar mas foi desafiador."
  },
  {
    value: "muito_pesado",
    label: "Muito pesado",
    description: "Este exercício estava muito pesado, tive muita dificuldade para completar as repetições."
  },
  {
    value: "errei_carga",
    label: "Errei a carga",
    description: "Percebi que coloquei uma carga incorreta para este exercício hoje."
  },
  {
    value: "socorro",
    label: "Socorro!",
    description: "Este exercício foi impossível ou me causou desconforto/dor durante a execução."
  }
];

export const FATIGUE_OPTIONS = [
  {
    value: 0.5,
    label: "Nem parece que treinei",
    description: "Este exercício não deixou meus músculos nem um pouco cansados hoje."
  },
  {
    value: 0,
    label: "Esse pegou",
    description: "Eu senti uma boa/razoável fadiga muscular com este exercício hoje."
  },
  {
    value: -0.5,
    label: "Quase morri",
    description: "Meus músculos estão totalmente exaustos depois deste exercício hoje."
  }
];

export const PAIN_OPTIONS = [
  {
    value: 0.5,
    label: "Nunca fiquei dolorido",
    description: "Eu nunca tive nenhuma dor nesse(s) músculo(s) depois do último treino."
  },
  {
    value: 0,
    label: "Tive alguma dor",
    description: "Eu cheguei a ficar dolorido depois do treino passado, mas já me recuperei."
  },
  {
    value: -0.5,
    label: "Ainda estou dolorido",
    description: "Tive bastante dor e ainda estou (ou passei vários dias) dolorido depois do último treino."
  }
];

export const INCREMENT_OPTIONS = [
  { value: 1, label: "1 kg", description: "Incremento mínimo de 1 kg" },
  { value: 2.5, label: "2.5 kg", description: "Incremento mínimo de 2.5 kg (recomendado)" },
  { value: 5, label: "5 kg", description: "Incremento mínimo de 5 kg" }
];

export function useExerciseFeedback(exerciseId: string) {
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);
  const [showFatigueDialog, setShowFatigueDialog] = useState(false);
  const [showPainDialog, setShowPainDialog] = useState(false);
  const [showIncrementDialog, setShowIncrementDialog] = useState(false);
  
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
      
      // Show fatigue dialog after difficulty
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
      
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const savePainFeedback = async (pain: number) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({
          avaliacao_dor: pain,
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', exerciseId);
      
      if (error) throw error;
      
      setShowPainDialog(false);
      
      toast({
        title: "Avaliação de dor salva",
        description: "Sua avaliação de dor foi salva com sucesso!"
      });
      
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive"
      });
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
  
  const checkInitialConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('exercicios_treino_usuario')
        .select('configuracao_inicial')
        .eq('id', exerciseId)
        .single();
      
      if (error) throw error;
      
      // If exercise hasn't been configured yet
      if (data && !data.configuracao_inicial) {
        setShowIncrementDialog(true);
      }
      
    } catch (error: any) {
      console.error("Erro ao verificar configuração inicial:", error);
    }
  };
  
  const checkNeedsPainEvaluation = async (primaryMuscle: string, groupName: string) => {
    // Here we would check if the user has done an exercise for the same muscle group recently
    // For now, this is a placeholder for future implementation
    // This would check if there's a previous uncompleted pain evaluation for the same muscle group
    
    // For testing purposes, we can randomly decide to show the pain dialog
    const shouldAskForPain = Math.random() > 0.7;
    if (shouldAskForPain) {
      setShowPainDialog(true);
      return true;
    }
    
    return false;
  };

  return {
    showDifficultyDialog,
    setShowDifficultyDialog,
    showFatigueDialog,
    setShowFatigueDialog,
    showPainDialog,
    setShowPainDialog,
    showIncrementDialog,
    setShowIncrementDialog,
    saveDifficultyFeedback,
    saveFatigueFeedback,
    savePainFeedback,
    saveIncrementSetting,
    checkInitialConfiguration,
    checkNeedsPainEvaluation,
  };
}
