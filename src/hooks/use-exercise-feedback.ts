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
  
  const checkNeedsPainEvaluation = async (primaryMuscle: string) => {
    if (!primaryMuscle) return false;
    
    try {
      const { data: previousExercises, error } = await supabase
        .from('exercicios_treino_usuario')
        .select('id, treino_usuario_id, data_avaliacao')
        .eq('primary_muscle', primaryMuscle)
        .eq('concluido', true)
        .neq('id', exerciseId)
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      if (!previousExercises || previousExercises.length === 0) {
        return false;
      }
      
      const hasRecentEvaluation = previousExercises.some(ex => 
        ex.id !== exerciseId && 
        ex.data_avaliacao !== null && 
        new Date(ex.data_avaliacao).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      
      if (!hasRecentEvaluation && previousExercises.length > 0) {
        setShowPainDialog(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Erro ao verificar necessidade de avaliação de dor:", error);
      return false;
    }
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
