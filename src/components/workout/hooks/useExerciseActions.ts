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
  checkIsFirstWeek: () => Promise<boolean>,
  originalSetCount?: number
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
      // Persist updated set count if changed
      if (originalSetCount !== undefined && sets.length !== originalSetCount) {
        await supabase
          .from('exercicios_treino_usuario')
          .update({ series: sets.length })
          .eq('id', exercise.id);
        console.log(`Updated series count from ${originalSetCount} to ${sets.length} for ${exercise.nome}`);
      }

      await onExerciseComplete(exercise.id, true);

      // DUPLA CHECAGEM: Check if this is the first week
      // Force first week if peso or reps_programadas are null (e.g., after exercise substitution)
      const { data: exerciseData } = await supabase
        .from('exercicios_treino_usuario')
        .select('peso, reps_programadas')
        .eq('id', exercise.id)
        .single();
      
      const isFirstWeek = (exerciseData?.peso === null || exerciseData?.reps_programadas === null)
        ? true
        : await checkIsFirstWeek();
      
      if (exerciseData?.peso === null || exerciseData?.reps_programadas === null) {
        console.log(`DUPLA CHECAGEM: Null data detected for ${exercise.nome} - forcing first week treatment`);
      }
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
      // First, save observation to current exercise
      const { error: currentError } = await supabase
        .from('exercicios_treino_usuario')
        .update({ observacao: observation })
        .eq('id', exercise.id);

      if (currentError) {
        console.error('Erro ao salvar observação:', currentError);
        toast({
          title: "Erro ao salvar observação",
          description: currentError.message,
          variant: "destructive"
        });
        return;
      }

      // Get current exercise and workout info to replicate observation to future exercises
      const { data: currentExercise, error: exerciseError } = await supabase
        .from('exercicios_treino_usuario')
        .select(`
          exercicio_original_id,
          card_original_id,
          treino_usuario_id,
          treinos_usuario!inner(programa_usuario_id)
        `)
        .eq('id', exercise.id)
        .single();

      if (exerciseError || !currentExercise) {
        console.error('Erro ao buscar dados do exercício:', exerciseError);
        toast({
          title: "Observação salva",
          description: "Observação salva no exercício atual."
        });
        setShowObservationInput(false);
        return;
      }

      // Replicate observation to all future exercises of the same type in the same program
      const hasIdentifier = currentExercise.card_original_id || currentExercise.exercicio_original_id;
      if (hasIdentifier) {
        // Get all workout IDs for the same program
        const { data: workoutIds, error: workoutError } = await supabase
          .from('treinos_usuario')
          .select('id')
          .eq('programa_usuario_id', (currentExercise.treinos_usuario as any).programa_usuario_id);

        if (workoutError) {
          console.error('Erro ao buscar treinos do programa:', workoutError);
          toast({
            title: "Observação salva",
            description: "Observação salva no exercício atual."
          });
        } else {
          const workoutIdList = workoutIds.map(w => w.id);
          
          // Build replication query: prefer card_original_id, fallback to exercicio_original_id
          let replicationQuery = supabase
            .from('exercicios_treino_usuario')
            .update({ observacao: observation })
            .eq('concluido', false)
            .in('treino_usuario_id', workoutIdList);

          if (currentExercise.card_original_id) {
            replicationQuery = replicationQuery.eq('card_original_id', currentExercise.card_original_id);
          } else {
            replicationQuery = replicationQuery.eq('exercicio_original_id', currentExercise.exercicio_original_id);
          }

          const { error: replicationError } = await replicationQuery;

          if (replicationError) {
            console.error('Erro ao replicar observação:', replicationError);
            toast({
              title: "Observação salva",
              description: "Observação salva no exercício atual."
            });
          } else {
            toast({
              title: "Observação salva",
              description: "Observação salva e replicada para exercícios futuros!"
            });
          }
        }
      } else {
        toast({
          title: "Observação salva",
          description: "Sua observação foi registrada com sucesso."
        });
      }

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


  const addNote = async (noteText: string, setShowNoteInput: React.Dispatch<React.SetStateAction<boolean>>) => {
    try {
      // Find the first completed series for this exercise to attach the note
      const { data: completedSeries, error: seriesError } = await supabase
        .from('series_exercicio_usuario')
        .select('id')
        .eq('exercicio_usuario_id', exercise.id)
        .eq('concluida', true)
        .order('numero_serie', { ascending: true })
        .limit(1);

      if (seriesError) {
        console.error('Erro ao buscar séries:', seriesError);
        toast({
          title: "Erro ao salvar nota",
          description: seriesError.message,
          variant: "destructive"
        });
        return;
      }

      if (!completedSeries || completedSeries.length === 0) {
        toast({
          title: "Erro ao salvar nota",
          description: "Complete pelo menos uma série antes de adicionar uma nota",
          variant: "destructive"
        });
        return;
      }

      // Save note to the first completed series
      const { error: updateError } = await supabase
        .from('series_exercicio_usuario')
        .update({ nota: noteText })
        .eq('id', completedSeries[0].id);

      if (updateError) {
        console.error('Erro ao salvar nota:', updateError);
        toast({
          title: "Erro ao salvar nota",
          description: updateError.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Nota salva",
        description: "Sua anotação foi salva com sucesso."
      });
      setShowNoteInput(false);
    } catch (error: any) {
      console.error('Erro ao salvar nota:', error);
      toast({
        title: "Erro ao salvar nota",
        description: error.message,
        variant: "destructive"
      });
    }
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
    addNote
  };
};
