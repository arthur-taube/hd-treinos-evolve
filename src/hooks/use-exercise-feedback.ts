import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

// Combined fatigue and pain options for beginners
export const COMBINED_FATIGUE_PAIN_OPTIONS = [
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
    description: "Esse exercício causou uma boa fadiga muscular hoje e me deixou dolorido por vários dias na semana passada (chegando a afetar o treino seguinte)."
  },
  {
    value: -1,
    label: "Quase morri",
    description: "Esse exercício deixou meus músculos totalmente exaustos hoje e com uma dor muscular forte e prolongada na semana passada (chegando a afetar o treino seguinte)."
  }
];

export const INCREMENT_OPTIONS = [
  { value: 1, label: "1 kg", description: "Incremento mínimo de 1 kg" },
  { value: 2.5, label: "2.5 kg", description: "Incremento mínimo de 2.5 kg (recomendado)" },
  { value: 5, label: "5 kg", description: "Incremento mínimo de 5 kg" }
];

export function useExerciseFeedback(exerciseId: string) {
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);
  const [showIncrementDialog, setShowIncrementDialog] = useState(false);
  const [showCombinedFatiguePainDialog, setShowCombinedFatiguePainDialog] = useState(false);
  
  // Remove unused fatigue and pain dialogs
  const [showFatigueDialog] = useState(false);
  const [showPainDialog] = useState(false);
  
  const checkInitialConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('exercicios_treino_usuario')
        .select('configuracao_inicial')
        .eq('id', exerciseId)
        .single();
      
      if (error) throw error;
      
      // Se o exercício já foi configurado, não mostrar o diálogo
      if (data && data.configuracao_inicial === true) {
        console.log('Exercício já configurado, não mostrando diálogo de incremento');
        return;
      }
      
      // Se exercise hasn't been configured yet, show dialog
      if (data && !data.configuracao_inicial) {
        setShowIncrementDialog(true);
      }
      
    } catch (error: any) {
      console.error("Erro ao verificar configuração inicial:", error);
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
      // Show combined fatigue/pain dialog instead of separate ones
      setShowCombinedFatiguePainDialog(true);
      
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // New function for combined fatigue/pain evaluation
  const saveCombinedFatiguePainFeedback = async (value: number) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({
          avaliacao_fadiga: value,
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', exerciseId);
      
      if (error) throw error;
      
      setShowCombinedFatiguePainDialog(false);
      
      toast({
        title: "Avaliação salva",
        description: "Sua avaliação foi salva com sucesso!"
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

  // Keep legacy functions for compatibility but they don't do anything meaningful
  const saveFatigueFeedback = async () => {
    console.log('Legacy fatigue feedback - using combined evaluation instead');
  };

  const savePainFeedback = async () => {
    console.log('Legacy pain feedback - using combined evaluation instead');
  };

  return {
    showDifficultyDialog,
    setShowDifficultyDialog,
    showFatigueDialog,
    setShowFatigueDialog: () => {}, // No-op
    showPainDialog,
    setShowPainDialog: () => {}, // No-op
    showIncrementDialog,
    setShowIncrementDialog,
    showCombinedFatiguePainDialog,
    setShowCombinedFatiguePainDialog,
    saveDifficultyFeedback,
    saveFatigueFeedback,
    saveCombinedFatiguePainFeedback,
    savePainFeedback,
    saveIncrementSetting,
    checkInitialConfiguration,
  };
}
