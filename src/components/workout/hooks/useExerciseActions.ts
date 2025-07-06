
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SetData } from "./useExerciseState";
import { updateRepsProgramadas, getIncrementoMinimo } from "@/utils/progressionCalculator";
import { calculateProgression } from "@/utils/progressionCalculator";
import { propagateIncrementoMinimo } from "@/utils/muscleDataLoader";

interface Exercise {
  id: string;
  nome: string;
  exercicio_original_id: string;
  peso: number | null;
  repeticoes: string | null;
  series: number;
  reps_programadas?: number | null;
}

export function useExerciseActions(
  exercise: Exercise,
  sets: SetData[],
  setSets: React.Dispatch<React.SetStateAction<SetData[]>>,
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>,
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>,
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setShowDifficultyDialog: React.Dispatch<React.SetStateAction<boolean>>,
  checkIsFirstWeek: () => Promise<boolean>
) {
  const handleSetComplete = (index: number) => {
    setSets(prevSets => {
      const newSets = [...prevSets];
      newSets[index].completed = !newSets[index].completed;
      return newSets;
    });
  };

  const handleWeightChange = (index: number, weight: number) => {
    setSets(prevSets => {
      const newSets = [...prevSets];
      newSets[index].weight = weight;
      if (index === 0) {
        onWeightUpdate(exercise.id, weight);
      }
      return newSets;
    });
  };

  const handleRepsChange = (index: number, reps: number) => {
    setSets(prevSets => {
      const newSets = [...prevSets];
      newSets[index].reps = reps;
      return newSets;
    });
  };

  const handleExerciseComplete = async () => {
    try {
      await supabase.rpc('ensure_series_table');
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        await supabase.rpc('save_series', {
          p_exercicio_id: exercise.id,
          p_numero_serie: i + 1,
          p_peso: set.weight || 0,
          p_repeticoes: set.reps || 0,
          p_concluida: set.completed
        });
      }

      const isFirstWeek = await checkIsFirstWeek();
      if (isFirstWeek) {
        const completedSets = sets.filter(set => set.completed && set.reps !== null);
        if (completedSets.length > 0) {
          const worstReps = Math.min(...completedSets.map(set => set.reps!));
          await updateRepsProgramadas(exercise.id, worstReps);
          console.log(`Primeira semana concluída - reps_programadas definidas como: ${worstReps}`);
        }
      }
      
      await onExerciseComplete(exercise.id, true);
      setIsOpen(false);
      setShowDifficultyDialog(true);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar séries",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveDifficultyFeedback = async (value: string, saveDifficultyFeedback: (value: string) => Promise<void>) => {
    await saveDifficultyFeedback(value);

    if (exercise.exercicio_original_id) {
      try {
        const isFirstWeek = exercise.reps_programadas === null;
        const { data: treinoUsuario } = await supabase
          .from('treinos_usuario')
          .select('programa_usuario_id')
          .eq('id', (await supabase
            .from('exercicios_treino_usuario')
            .select('treino_usuario_id')
            .eq('id', exercise.id)
            .single()).data?.treino_usuario_id || '')
          .single();
        
        if (treinoUsuario) {
          const incrementoMinimo = await getIncrementoMinimo(exercise.exercicio_original_id, treinoUsuario.programa_usuario_id);
          const completedSets = sets.filter(set => set.completed && set.reps !== null);
          
          if (completedSets.length > 0) {
            const bestReps = Math.max(...completedSets.map(set => set.reps!));
            const progressao = await calculateProgression({
              exerciseId: exercise.id,
              currentWeight: exercise.peso || 0,
              programmedReps: exercise.repeticoes || "10",
              executedReps: bestReps,
              currentSets: exercise.series,
              incrementoMinimo: incrementoMinimo,
              avaliacaoDificuldade: value,
              isFirstWeek: isFirstWeek
            });

            if (progressao.reps_programadas !== undefined) {
              await updateRepsProgramadas(exercise.id, progressao.reps_programadas);
              console.log('Progressão aplicada para próxima semana:', progressao);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao aplicar progressão:', error);
      }
    }
  };

  const handleSaveIncrementSetting = async (value: number, saveIncrementSetting: (value: number) => Promise<void>) => {
    await saveIncrementSetting(value);

    if (exercise.exercicio_original_id) {
      try {
        const { data: treinoUsuario } = await supabase
          .from('treinos_usuario')
          .select('programa_usuario_id')
          .eq('id', (await supabase
            .from('exercicios_treino_usuario')
            .select('treino_usuario_id')
            .eq('id', exercise.id)
            .single()).data?.treino_usuario_id || '')
          .single();
        
        if (treinoUsuario) {
          await propagateIncrementoMinimo(exercise.exercicio_original_id, treinoUsuario.programa_usuario_id, value);
        }
      } catch (error) {
        console.error('Erro ao propagar incremento mínimo:', error);
      }
    }
  };

  const saveObservation = async (observation: string, setShowObservationInput: React.Dispatch<React.SetStateAction<boolean>>) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ observacao: observation })
        .eq('id', exercise.id);
      
      if (error) throw error;
      
      toast({
        title: "Observação salva",
        description: "A observação foi salva com sucesso."
      });
      setShowObservationInput(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar observação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const skipIncompleteSets = async () => {
    await onExerciseComplete(exercise.id, true);
    setIsOpen(false);
    setShowDifficultyDialog(true);
  };

  const replaceExerciseThisWorkout = async () => {
    toast({
      description: "Funcionalidade a ser implementada: Substituir exercício neste treino"
    });
  };

  const replaceExerciseAllWorkouts = async () => {
    toast({
      description: "Funcionalidade a ser implementada: Substituir exercício em todos os treinos"
    });
  };

  const addNote = (setShowNoteInput: React.Dispatch<React.SetStateAction<boolean>>) => {
    toast({
      description: "Nota adicionada ao exercício"
    });
    setShowNoteInput(false);
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
}
