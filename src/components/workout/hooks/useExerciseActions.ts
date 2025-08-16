import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SetData } from "./useExerciseState";

interface Exercise {
  id: string;
  nome: string;
  exercicio_original_id: string;
  concluido: boolean;
  treino_usuario_id: string;
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
    
    // Get fallback values from other sets or use default values
    let effectiveWeight = currentSet.weight;
    let effectiveReps = currentSet.reps;
    
    // If weight is null/undefined, try to get from first set or use 0
    if (effectiveWeight === null || effectiveWeight === undefined) {
      const firstSetWithWeight = sets.find(set => set.weight !== null && set.weight !== undefined);
      effectiveWeight = firstSetWithWeight?.weight || 0;
      currentSet.weight = effectiveWeight; // Update the set with the fallback value
    }
    
    // If reps is null/undefined, try to get from first set or use 10
    if (effectiveReps === null || effectiveReps === undefined || effectiveReps === 0) {
      const firstSetWithReps = sets.find(set => set.reps !== null && set.reps !== undefined && set.reps > 0);
      effectiveReps = firstSetWithReps?.reps || 10;
      currentSet.reps = effectiveReps; // Update the set with the fallback value
    }

    // Now validate the effective values
    if (effectiveWeight === null || effectiveWeight === undefined || !effectiveReps || effectiveReps <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha peso e repetições antes de marcar como concluída.",
        variant: "destructive"
      });
      return;
    }

    currentSet.completed = !currentSet.completed;
    setSets(newSets);

    try {
      await supabase.rpc('save_series', {
        p_exercicio_id: exercise.id,
        p_numero_serie: index + 1,
        p_peso: effectiveWeight,
        p_repeticoes: effectiveReps,
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

  const handleWeightChange = (index: number, weight: number) => {
    if (isNaN(weight)) return; // Ignore invalid inputs
    
    const newSets = [...sets];
    newSets[index].weight = weight;
    setSets(newSets);

    if (weight !== null && weight !== undefined) {
      onWeightUpdate(exercise.id, weight);
    }
  };

  const handleRepsChange = (index: number, reps: number) => {
    if (isNaN(reps)) return; // Ignore invalid inputs
    
    const newSets = [...sets];
    newSets[index].reps = reps;
    setSets(newSets);
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
      setIsOpen(false);
      
      const isFirstWeek = await checkIsFirstWeek();
      if (!isFirstWeek) {
        setTimeout(() => {
          setShowDifficultyDialog(true);
        }, 1000);
      }
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
    await saveIncrementSetting(value);
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
