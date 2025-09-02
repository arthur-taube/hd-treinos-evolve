import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SetData } from "./useExerciseState";
import { getLastSeriesData } from "@/utils/lastSeriesHandler";

interface Exercise {
  id: string;
  nome: string;
  exercicio_original_id: string;
  concluido: boolean;
  treino_usuario_id: string;
  repeticoes?: string | null;
}

export const useExerciseActions = (
  exercise: Exercise,
  sets: SetData[],
  setSets: React.Dispatch<React.SetStateAction<SetData[]>>,
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>,
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>,
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setShowDifficultyDialog: React.Dispatch<React.SetStateAction<boolean>>,
  checkIsFirstWeek: () => Promise<boolean>
) => {
  const handleSetComplete = async (index: number) => {
    const newSets = [...sets];
    const currentSet = newSets[index];
    
    // Validation: require weight and reps before completing
    if (currentSet.weight === null || currentSet.weight === undefined || !currentSet.reps || currentSet.reps <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha peso (use 0 se necessário) e repetições (maior que 0) antes de marcar como concluída.",
        variant: "destructive"
      });
      return;
    }

    currentSet.completed = !currentSet.completed;
    setSets(newSets);

    // Remove onWeightUpdate call to prevent overwriting programmed weights
    // Weight updates now only happen for first week baseline in handleExerciseComplete

    try {
      await supabase.rpc('save_series', {
        p_exercicio_id: exercise.id,
        p_numero_serie: index + 1,
        p_peso: currentSet.weight,
        p_repeticoes: currentSet.reps,
        p_concluida: currentSet.completed
      });

      console.log(`Serie ${index + 1} salva:`, currentSet);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar série",
        description: error.message,
        variant: "destructive"
      });
      
      currentSet.completed = !currentSet.completed;
      setSets([...newSets]);
    }
  };

  const handleWeightChange = (index: number, value: string) => {
    const newSets = [...sets];
    
    // Handle empty string as null, otherwise convert to number
    if (value === '') {
      newSets[index].weight = null;
    } else {
      const numValue = Number(value);
      newSets[index].weight = isNaN(numValue) ? null : numValue;
    }
    
    setSets(newSets);
  };

  const handleRepsChange = (index: number, reps: number) => {
    const newSets = [...sets];
    newSets[index].reps = reps;
    setSets(newSets);
  };

  const handleWeightFocus = (index: number, suggestedWeight: number) => {
    const newSets = [...sets];
    
    // If weight is null (showing placeholder), fill with suggested value on focus
    if (newSets[index].weight === null) {
      newSets[index].weight = suggestedWeight;
      setSets(newSets);
    }
  };

  const handleExerciseComplete = async () => {
    if (exercise.concluido) return;

    const completedSets = sets.filter(set => set.completed);
    if (completedSets.length === 0) {
      toast({
        title: "Nenhuma série concluída",
        description: "Complete pelo menos uma série antes de finalizar o exercício.",
        variant: "destructive"
      });
      return;
    }

    try {
      await onExerciseComplete(exercise.id, true);

      // Check if this is the first week and handle baseline data only
      const isFirstWeek = await checkIsFirstWeek();
      if (isFirstWeek) {
        console.log(`First week detected for ${exercise.nome}, saving baseline data`);
        
        // Get last series data for baseline
        const lastSeriesData = await getLastSeriesData(exercise.id);
        let baselineReps: number | null = null;
        let baselineWeight: number | null = null;

        if (lastSeriesData !== null) {
          baselineReps = lastSeriesData.reps;
          baselineWeight = lastSeriesData.weight;
          console.log(`Using last series data as baseline: ${baselineReps} reps @ ${baselineWeight}kg`);
        } else if (exercise.repeticoes) {
          // Parse repeticoes to get minimum value as fallback for reps
          if (exercise.repeticoes.includes('-')) {
            baselineReps = parseInt(exercise.repeticoes.split('-')[0]);
          } else {
            baselineReps = parseInt(exercise.repeticoes);
          }
          console.log(`Using minimum repeticoes as baseline: ${baselineReps} reps`);
        }

        // Save baseline data if we have values
        const updateData: any = {};
        if (baselineReps !== null) {
          updateData.reps_programadas = baselineReps;
        }
        if (baselineWeight !== null) {
          updateData.peso = baselineWeight;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('exercicios_treino_usuario')
            .update(updateData)
            .eq('id', exercise.id);

          if (updateError) {
            console.error('Error saving baseline data:', updateError);
          } else {
            console.log(`Saved baseline data for ${exercise.nome}:`, updateData);
          }
        }
      } else {
        console.log(`Not first week for ${exercise.nome}, baseline data already established`);
      }

      setIsOpen(false);
      
      // Always show difficulty dialog after completing exercise
      setTimeout(() => {
        setShowDifficultyDialog(true);
      }, 500);
    } catch (error: any) {
      toast({
        title: "Erro ao concluir exercício",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveDifficultyFeedback = async (
    value: string, 
    saveDifficultyFeedback: (value: string) => Promise<void>
  ) => {
    await saveDifficultyFeedback(value);
  };

  const handleSaveIncrementSetting = async (
    value: number,
    saveIncrementSetting: (value: number) => Promise<void>
  ) => {
    try {
      await saveIncrementSetting(value);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar configuração",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const saveObservation = async (
    observation: string,
    setShowObservationInput: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ observacao: observation })
        .eq('id', exercise.id);

      if (error) throw error;
      
      setShowObservationInput(false);
      toast({
        title: "Observação salva",
        description: "Sua observação foi registrada com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar observação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const skipIncompleteSets = async () => {
    try {
      await onExerciseComplete(exercise.id, true);
      setIsOpen(false);
      toast({
        title: "Exercício finalizado",
        description: "Exercício marcado como concluído."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao finalizar exercício",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const replaceExerciseThisWorkout = async () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Em breve você poderá substituir exercícios."
    });
  };

  const replaceExerciseAllWorkouts = async () => {
    toast({
      title: "Funcionalidade em desenvolvimento", 
      description: "Em breve você poderá substituir exercícios em todos os treinos."
    });
  };

  const addNote = async (setShowNoteInput: React.Dispatch<React.SetStateAction<boolean>>) => {
    setShowNoteInput(false);
    toast({
      title: "Nota adicionada",
      description: "Sua anotação foi salva."
    });
  };

  return {
    handleSetComplete,
    handleWeightChange,
    handleRepsChange,
    handleWeightFocus,
    handleExerciseComplete,
    handleSaveDifficultyFeedback,
    handleSaveIncrementSetting,
    saveObservation,
    skipIncompleteSets,
    replaceExerciseThisWorkout,
    replaceExerciseAllWorkouts,
    addNote
  };
};
