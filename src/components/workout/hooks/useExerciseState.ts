import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SetData {
  number: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

export interface SeriesData {
  date: string;
  weight: number;
  reps: number;
}

interface Exercise {
  id: string;
  nome: string;
  series: number;
  peso: number | null;
  observacao?: string | null;
  concluido: boolean;
  configuracao_inicial?: boolean;
  reps_programadas?: number | null;
  incremento_minimo?: number | null;
  exercicio_original_id: string;
}

export const useExerciseState = (
  exercise: Exercise,
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>,
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [observation, setObservation] = useState(exercise.observacao || "");
  const [showObservationInput, setShowObservationInput] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [exerciseNote, setExerciseNote] = useState("");
  const [sets, setSets] = useState<SetData[]>([]);
  
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);
  const [showFatigueDialog, setShowFatigueDialog] = useState(false);
  const [showPainDialog, setShowPainDialog] = useState(false);
  const [showIncrementDialog, setShowIncrementDialog] = useState(false);

  // Initialize sets with progression values if available
  useEffect(() => {
    const initializeSets = async () => {
      console.log(`Initializing sets for exercise: ${exercise.nome}`);
      console.log(`Exercise data:`, exercise);
      
      const initialSets: SetData[] = Array.from({ length: exercise.series }, (_, index) => ({
        number: index + 1,
        weight: null,
        reps: null,
        completed: false
      }));

      // Check if we should apply automatic progression
      const shouldApplyProgression = await shouldApplyAutomaticProgression();
      console.log(`Should apply progression for ${exercise.nome}:`, shouldApplyProgression);

      if (shouldApplyProgression) {
        const progressionData = await calculateAutomaticProgression();
        console.log(`Calculated progression for ${exercise.nome}:`, progressionData);
        
        if (progressionData) {
          // Apply progression to the first set (others will follow user input)
          initialSets[0].weight = progressionData.suggestedWeight;
          initialSets[0].reps = progressionData.suggestedReps;
          
          console.log(`Applied progression to first set:`, initialSets[0]);
        }
      }

      setSets(initialSets);
    };

    initializeSets();
  }, [exercise.id, exercise.series]);

  const shouldApplyAutomaticProgression = async (): Promise<boolean> => {
    // If incremento_minimo is set, we can apply progression regardless of configuracao_inicial
    if (exercise.incremento_minimo && exercise.incremento_minimo > 0) {
      console.log(`Exercise ${exercise.nome} has incremento_minimo: ${exercise.incremento_minimo}`);
      return true;
    }

    // Fallback to checking configuracao_inicial
    if (exercise.configuracao_inicial === true) {
      console.log(`Exercise ${exercise.nome} has configuracao_inicial: true`);
      return true;
    }

    console.log(`Exercise ${exercise.nome} cannot apply progression - no incremento_minimo or configuracao_inicial`);
    return false;
  };

  const calculateAutomaticProgression = async () => {
    try {
      if (!exercise.exercicio_original_id) {
        console.log(`No exercicio_original_id for ${exercise.nome}`);
        return null;
      }

      // Get the last completed exercise with evaluation
      const { data: lastExercise, error: exerciseError } = await supabase
        .from('exercicios_treino_usuario')
        .select('peso, series, repeticoes, avaliacao_dificuldade, avaliacao_fadiga, avaliacao_dor, incremento_minimo')
        .eq('exercicio_original_id', exercise.exercicio_original_id)
        .eq('concluido', true)
        .not('avaliacao_dificuldade', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exerciseError) {
        console.error('Error fetching last exercise:', exerciseError);
        return null;
      }

      if (!lastExercise) {
        console.log(`No previous exercise data found for ${exercise.nome}`);
        return null;
      }

      console.log(`Last exercise data for ${exercise.nome}:`, lastExercise);

      // Get the best series from the previous workout
      const { data: previousSeries, error: seriesError } = await supabase
        .rpc('get_series_by_exercise', { exercise_id: exercise.id });

      if (seriesError) {
        console.error('Error fetching previous series:', seriesError);
        return null;
      }

      let bestReps = 0;
      if (previousSeries && previousSeries.length > 0) {
        const bestSeries = previousSeries.reduce((best, current) => {
          const bestVolume = best.peso * best.repeticoes;
          const currentVolume = current.peso * current.repeticoes;
          return currentVolume > bestVolume ? current : best;
        }, previousSeries[0]);
        bestReps = bestSeries.repeticoes;
      }

      const incrementoMinimo = exercise.incremento_minimo || lastExercise.incremento_minimo || 1;
      const currentWeight = lastExercise.peso || 0;
      const difficulty = lastExercise.avaliacao_dificuldade;

      console.log(`Progression calculation inputs for ${exercise.nome}:`, {
        currentWeight,
        bestReps,
        difficulty,
        incrementoMinimo
      });

      // Simple progression logic based on difficulty
      let suggestedWeight = currentWeight;
      let suggestedReps = exercise.reps_programadas || bestReps || 10;

      if (difficulty === 'facil') {
        // Increase weight by 2 increments, keep reps
        suggestedWeight = currentWeight + (incrementoMinimo * 2);
      } else if (difficulty === 'bom') {
        // Increase weight by 1 increment, keep reps
        suggestedWeight = currentWeight + incrementoMinimo;
      } else if (difficulty === 'dificil') {
        // Keep weight, increase reps by 1
        suggestedReps = Math.min(bestReps + 1, 12);
      }

      const result = {
        suggestedWeight: Math.max(suggestedWeight, 0),
        suggestedReps: Math.max(suggestedReps, 1)
      };

      console.log(`Calculated progression for ${exercise.nome}:`, result);
      return result;

    } catch (error) {
      console.error('Error calculating automatic progression:', error);
      return null;
    }
  };

  const checkNeedsIncrementConfiguration = (): boolean => {
    // If incremento_minimo is already set, no need to configure
    if (exercise.incremento_minimo && exercise.incremento_minimo > 0) {
      console.log(`Exercise ${exercise.nome} already has incremento_minimo: ${exercise.incremento_minimo}`);
      return false;
    }

    // Check if configuracao_inicial is false or null
    if (exercise.configuracao_inicial !== true) {
      console.log(`Exercise ${exercise.nome} needs increment configuration`);
      return true;
    }

    return false;
  };

  const checkIsFirstWeek = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('exercicios_treino_usuario')
        .select('id')
        .eq('exercicio_original_id', exercise.exercicio_original_id)
        .eq('concluido', true)
        .limit(1);

      if (error) {
        console.error('Error checking first week:', error);
        return true;
      }

      const isFirstWeek = !data || data.length === 0;
      console.log(`Is first week for ${exercise.nome}:`, isFirstWeek);
      return isFirstWeek;
    } catch (error) {
      console.error('Error in checkIsFirstWeek:', error);
      return true;
    }
  };

  const saveDifficultyFeedback = async (value: string) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ 
          avaliacao_dificuldade: value,
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', exercise.id);

      if (error) throw error;

      toast({
        title: "Avaliação salva",
        description: "Sua avaliação de dificuldade foi registrada."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const saveFatigueFeedback = async (value: string) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ 
          avaliacao_fadiga: parseInt(value),
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', exercise.id);

      if (error) throw error;

      toast({
        title: "Avaliação de fadiga salva",
        description: "Sua avaliação foi registrada."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const savePainFeedback = async (value: string) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ 
          avaliacao_dor: parseInt(value),
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', exercise.id);

      if (error) throw error;

      toast({
        title: "Avaliação de dor salva",
        description: "Sua avaliação foi registrada."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const saveIncrementSetting = async (value: number) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ 
          incremento_minimo: value,
          configuracao_inicial: true
        })
        .eq('id', exercise.id);

      if (error) throw error;

      toast({
        title: "Configuração salva",
        description: `Incremento mínimo de ${value}kg definido para este exercício.`
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
    isOpen,
    setIsOpen,
    observation,
    setObservation,
    showObservationInput,
    setShowObservationInput,
    showNoteInput,
    setShowNoteInput,
    exerciseNote,
    setExerciseNote,
    sets,
    setSets,
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
    checkIsFirstWeek,
    checkNeedsIncrementConfiguration
  };
};
