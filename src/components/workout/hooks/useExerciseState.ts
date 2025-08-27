
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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

  // Reset incrementDialogShown when exercise.id changes
  useEffect(() => {
    setIncrementDialogShown(false);
  }, [exercise.id]);

  // Check for increment configuration when exercise is opened (only once per session)
  useEffect(() => {
    const checkIncrementConfig = async () => {
      if (isOpen && !exercise.concluido && !incrementDialogShown) {
        console.log(`Checking increment configuration for ${exercise.nome}`);
        
        const needsConfiguration = await feedbackHook.checkInitialConfiguration();
        
        if (needsConfiguration) {
          console.log(`Exercise ${exercise.nome} needs increment configuration`);
          feedbackHook.setShowIncrementDialog(true);
        } else {
          console.log(`Exercise ${exercise.nome} already has increment configuration`);
        }
        
        setIncrementDialogShown(true);
      }
    };

    checkIncrementConfig();
  }, [isOpen, exercise.concluido, incrementDialogShown, exercise.id]);

  // Initialize sets with existing database values (no progression calculation)
  useEffect(() => {
    const initializeSets = () => {
      console.log(`=== INITIALIZING SETS FOR ${exercise.nome} ===`);
      console.log(`Exercise data:`, exercise);
      
      const initialSets: SetData[] = Array.from({ length: exercise.series }, (_, index) => {
        // Determine reps for display
        let displayReps: number | null = null;
        if (exercise.reps_programadas) {
          displayReps = exercise.reps_programadas;
        } else if (exercise.repeticoes) {
          // Use minimum of range for display
          if (exercise.repeticoes.includes('-')) {
            displayReps = parseInt(exercise.repeticoes.split('-')[0]);
          } else {
            displayReps = parseInt(exercise.repeticoes);
          }
        }

        return {
          number: index + 1,
          weight: index === 0 ? exercise.peso : null, // Only first set gets pre-filled weight
          reps: displayReps,
          completed: false
        };
      });

      console.log(`Initialized sets for ${exercise.nome}:`, initialSets);
      setSets(initialSets);
    };

    initializeSets();
  }, [exercise.id, exercise.series, exercise.peso, exercise.reps_programadas, exercise.repeticoes]);

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
