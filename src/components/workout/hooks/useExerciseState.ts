
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { calculateProgression, getCurrentRepsProgramadas, updateRepsProgramadas, getWorstSeriesReps } from "@/utils/progressionCalculator";
import { useExerciseFeedback } from "@/hooks/use-exercise-feedback";

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
  repeticoes?: string | null;
  treino_usuario_id: string;
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
  const [incrementDialogShown, setIncrementDialogShown] = useState(false);
  
  // Use the feedback hook for managing all feedback dialogs and functions
  const feedbackHook = useExerciseFeedback(exercise.id);

  // Check for increment configuration when exercise is opened (only once per session)
  useEffect(() => {
    const checkIncrementConfig = async () => {
      if (isOpen && !exercise.concluido && !incrementDialogShown) {
        console.log(`Checking increment config for ${exercise.nome}:`, {
          incremento_minimo: exercise.incremento_minimo,
          configuracao_inicial: exercise.configuracao_inicial
        });
        
        // Use the hook's check method for proper validation
        const needsConfig = await feedbackHook.checkInitialConfiguration();
        if (needsConfig) {
          console.log(`Exercise ${exercise.nome} needs increment configuration`);
          setIncrementDialogShown(true);
        } else {
          console.log(`Exercise ${exercise.nome} already configured`);
        }
      }
    };

    checkIncrementConfig();
  }, [isOpen, exercise.concluido, incrementDialogShown, exercise.nome, exercise.incremento_minimo]);

  // Initialize sets with progression values if available
  useEffect(() => {
    const initializeSets = async () => {
      console.log(`=== INICIANDO CÁLCULO DE PROGRESSÃO PARA ${exercise.nome} ===`);
      console.log(`Exercise ID: ${exercise.id}`);
      console.log(`Treino Usuario ID: ${exercise.treino_usuario_id}`);
      console.log(`Exercise data:`, exercise);
      
      const initialSets: SetData[] = Array.from({ length: exercise.series }, (_, index) => ({
        number: index + 1,
        weight: null,
        reps: null,
        completed: false
      }));

      // Only apply progression if incremento_minimo is defined
      if (exercise.incremento_minimo && exercise.incremento_minimo > 0) {
        const progressionData = await calculateAutomaticProgression();
        console.log(`Calculated progression for ${exercise.nome}:`, progressionData);
        
        if (progressionData) {
          initialSets[0].weight = progressionData.suggestedWeight;
          initialSets[0].reps = progressionData.suggestedReps;
          console.log(`Applied progression to first set:`, initialSets[0]);
        }
      } else {
        console.log(`Exercise ${exercise.nome} has no incremento_minimo, skipping progression`);
      }

      setSets(initialSets);
    };

    initializeSets();
  }, [exercise.id, exercise.series, exercise.incremento_minimo]);

  const calculateAutomaticProgression = async () => {
    try {
      if (!exercise.exercicio_original_id || !exercise.incremento_minimo) {
        console.log(`No progression data available for ${exercise.nome}`);
        return null;
      }

      // Get current programa_usuario_id
      const { data: currentWorkout, error: workoutError } = await supabase
        .from('treinos_usuario')
        .select('programa_usuario_id')
        .eq('id', exercise.treino_usuario_id)
        .single();

      if (workoutError || !currentWorkout) {
        console.error('Error fetching current workout:', workoutError);
        return null;
      }

      const currentProgramaUsuarioId = currentWorkout.programa_usuario_id;
      console.log(`Current programa_usuario_id: ${currentProgramaUsuarioId}`);

      // Get the last completed exercise WITH SAME PROGRAMA_USUARIO_ID
      const { data: lastExercises, error: exerciseError } = await supabase
        .from('exercicios_treino_usuario')
        .select(`
          peso, 
          series, 
          repeticoes, 
          reps_programadas,
          avaliacao_dificuldade, 
          avaliacao_fadiga, 
          incremento_minimo,
          updated_at,
          treino_usuario_id,
          treinos_usuario!inner(programa_usuario_id)
        `)
        .eq('exercicio_original_id', exercise.exercicio_original_id)
        .eq('concluido', true)
        .eq('treinos_usuario.programa_usuario_id', currentProgramaUsuarioId)
        .not('avaliacao_dificuldade', 'is', null)
        .neq('id', exercise.id)
        .order('updated_at', { ascending: false });

      if (exerciseError) {
        console.error('Error fetching last exercise:', exerciseError);
        return null;
      }

      // Check if this is the first week
      const isFirstWeek = !lastExercises || lastExercises.length === 0;
      console.log(`Is first week for ${exercise.nome}:`, isFirstWeek);

      let lastExercise;
      let executedReps;

      if (isFirstWeek) {
        console.log(`First week - getting worst series for baseline`);
        
        // For first week, we need to get executedReps from the worst series of this current exercise
        // But since we haven't completed it yet, we'll use a fallback approach
        executedReps = await getWorstSeriesReps(exercise.id);
        
        if (!executedReps) {
          // Fallback: use reps_programadas or extract from repeticoes
          if (exercise.reps_programadas && exercise.reps_programadas > 0) {
            executedReps = exercise.reps_programadas;
          } else if (exercise.repeticoes && !exercise.repeticoes.includes('-')) {
            executedReps = parseInt(exercise.repeticoes);
          } else if (exercise.repeticoes && exercise.repeticoes.includes('-')) {
            executedReps = parseInt(exercise.repeticoes.split('-')[0]);
          } else {
            executedReps = 10; // Ultimate fallback
          }
        }
        
        console.log(`First week executedReps determined: ${executedReps}`);
        
        // Create a mock lastExercise for first week
        lastExercise = {
          peso: exercise.peso || 0,
          series: exercise.series,
          repeticoes: exercise.repeticoes || "10",
          reps_programadas: executedReps,
          avaliacao_dificuldade: "bom", // Default for first week
          avaliacao_fadiga: 0 // Neutral
        };
      } else {
        lastExercise = lastExercises[0];
        console.log(`Previous exercise data for ${exercise.nome}:`, lastExercise);
        
        // Get executed reps from the last exercise
        executedReps = await getWorstSeriesReps(lastExercise.treino_usuario_id);
        if (!executedReps) {
          executedReps = lastExercise.reps_programadas || 10;
        }
      }

      // Get current reps_programadas
      let currentRepsProgramadas = exercise.reps_programadas;
      if (!currentRepsProgramadas) {
        currentRepsProgramadas = await getCurrentRepsProgramadas(exercise.id);
      }

      // Use the complete progression calculator
      const progressionParams = {
        exerciseId: exercise.id,
        currentWeight: lastExercise.peso || 0,
        programmedReps: exercise.repeticoes || lastExercise.repeticoes || "10",
        executedReps: executedReps,
        currentSets: lastExercise.series || exercise.series,
        incrementoMinimo: exercise.incremento_minimo,
        avaliacaoDificuldade: lastExercise.avaliacao_dificuldade,
        avaliacaoFadiga: lastExercise.avaliacao_fadiga || 0,
        isFirstWeek: isFirstWeek
      };

      console.log(`Progression params for ${exercise.nome}:`, progressionParams);

      const progressionResult = await calculateProgression(progressionParams);
      console.log(`Progression result for ${exercise.nome}:`, progressionResult);

      // Always update exercise with new values, including reps_programadas
      const updateData: any = {
        peso: progressionResult.newWeight,
        series: progressionResult.newSets
      };

      // Always update reps_programadas when we have a calculated value
      if (progressionResult.reps_programadas !== undefined) {
        updateData.reps_programadas = progressionResult.reps_programadas;
        await updateRepsProgramadas(exercise.id, progressionResult.reps_programadas);
        console.log(`Updated reps_programadas to: ${progressionResult.reps_programadas}`);
      }

      // Update the exercise in database
      const { error: updateError } = await supabase
        .from('exercicios_treino_usuario')
        .update(updateData)
        .eq('id', exercise.id);

      if (updateError) {
        console.error('Error updating exercise with progression:', updateError);
      } else {
        console.log(`Updated exercise ${exercise.nome} with progression:`, updateData);
      }

      // Determine suggested reps for UI
      let suggestedReps: number;
      if (progressionResult.reps_programadas !== undefined) {
        suggestedReps = progressionResult.reps_programadas;
      } else if (exercise.repeticoes && !exercise.repeticoes.includes('-')) {
        suggestedReps = parseInt(exercise.repeticoes);
      } else if (exercise.repeticoes && exercise.repeticoes.includes('-')) {
        suggestedReps = parseInt(exercise.repeticoes.split('-')[0]);
      } else {
        suggestedReps = 10;
      }

      return {
        suggestedWeight: progressionResult.newWeight,
        suggestedReps: suggestedReps
      };

    } catch (error) {
      console.error('Error calculating automatic progression:', error);
      return null;
    }
  };

  const checkIsFirstWeek = async (): Promise<boolean> => {
    try {
      // Get current programa_usuario_id
      const { data: currentWorkout, error: workoutError } = await supabase
        .from('treinos_usuario')
        .select('programa_usuario_id')
        .eq('id', exercise.treino_usuario_id)
        .single();

      if (workoutError || !currentWorkout) {
        console.error('Error checking first week:', workoutError);
        return true;
      }

      // Check for previous completed exercises in the same program
      const { data, error } = await supabase
        .from('exercicios_treino_usuario')
        .select(`
          id,
          treino_usuario_id,
          treinos_usuario!inner(programa_usuario_id)
        `)
        .eq('exercicio_original_id', exercise.exercicio_original_id)
        .eq('concluido', true)
        .eq('treinos_usuario.programa_usuario_id', currentWorkout.programa_usuario_id)
        .neq('id', exercise.id)
        .limit(1);

      if (error) {
        console.error('Error checking first week:', error);
        return true;
      }

      const isFirstWeek = !data || data.length === 0;
      console.log(`Is first week for ${exercise.nome} in program ${currentWorkout.programa_usuario_id}:`, isFirstWeek);
      return isFirstWeek;
    } catch (error) {
      console.error('Error in checkIsFirstWeek:', error);
      return true;
    }
  };

  // Custom save increment function that prevents reopening
  const customSaveIncrementSetting = async (value: number) => {
    await feedbackHook.saveIncrementSetting(value);
    setIncrementDialogShown(true); // Mark as shown to prevent reopening
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
    showDifficultyDialog: feedbackHook.showDifficultyDialog,
    setShowDifficultyDialog: feedbackHook.setShowDifficultyDialog,
    showFatigueDialog: feedbackHook.showFatigueDialog,
    setShowFatigueDialog: feedbackHook.setShowFatigueDialog,
    showIncrementDialog: feedbackHook.showIncrementDialog,
    setShowIncrementDialog: feedbackHook.setShowIncrementDialog,
    saveDifficultyFeedback: feedbackHook.saveDifficultyFeedback,
    saveFatigueFeedback: feedbackHook.saveFatigueFeedback,
    saveIncrementSetting: customSaveIncrementSetting,
    checkIsFirstWeek
  };
};
