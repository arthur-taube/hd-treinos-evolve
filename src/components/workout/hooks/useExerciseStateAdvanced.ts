import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { roundSetsForDisplay } from "@/utils/progressionCalculator";
import { toast } from "sonner";

export interface SetDataAdvanced {
  number: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
  note: string;
}

interface ExerciseAdvanced {
  id: string;
  nome: string;
  series: number;
  peso: number | null;
  observacao?: string | null;
  concluido: boolean;
  configuracao_inicial?: boolean;
  incremento_minimo?: number | null;
  exercicio_original_id: string | null;
  card_original_id?: string | null;
  repeticoes?: string | null;
  treino_usuario_id: string;
}

export const useExerciseStateAdvanced = (
  exercise: ExerciseAdvanced,
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>,
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [observation, setObservation] = useState(exercise.observacao || "");
  const [showObservationInput, setShowObservationInput] = useState(false);
  const [sets, setSets] = useState<SetDataAdvanced[]>([]);
  const [originalSetCount, setOriginalSetCount] = useState(0);
  const [showIncrementDialog, setShowIncrementDialog] = useState(false);
  const [incrementDialogShown, setIncrementDialogShown] = useState(false);

  useEffect(() => {
    setIncrementDialogShown(false);
  }, [exercise.id]);

  // Check for increment config when opened
  useEffect(() => {
    const checkIncrementConfig = async () => {
      if (isOpen && !exercise.concluido && !incrementDialogShown) {
        if (!exercise.configuracao_inicial && !exercise.incremento_minimo) {
          setShowIncrementDialog(true);
        }
        setIncrementDialogShown(true);
      }
    };
    checkIncrementConfig();
  }, [isOpen, exercise.concluido, incrementDialogShown, exercise.id]);

  // Initialize sets
  useEffect(() => {
    const setsCount = roundSetsForDisplay(exercise.series);
    
    // Parse rep range for default reps
    let defaultReps: number | null = null;
    if (exercise.repeticoes) {
      if (exercise.repeticoes.includes('-')) {
        defaultReps = parseInt(exercise.repeticoes.split('-')[0]);
      } else {
        defaultReps = parseInt(exercise.repeticoes);
      }
    }

    const initialSets: SetDataAdvanced[] = Array.from({ length: setsCount }, (_, index) => ({
      number: index + 1,
      weight: null,
      reps: defaultReps,
      completed: false,
      note: ''
    }));

    setSets(initialSets);
    setOriginalSetCount(setsCount);
  }, [exercise.id, exercise.series]);

  const addSet = () => {
    setSets(prev => [
      ...prev,
      { number: prev.length + 1, weight: null, reps: null, completed: false, note: '' }
    ]);
  };

  const removeSet = (index: number) => {
    setSets(prev => {
      const newSets = prev.filter((_, i) => i !== index);
      return newSets.map((set, i) => ({ ...set, number: i + 1 }));
    });
  };

  const resetIncrementDialogShown = () => {
    setIncrementDialogShown(false);
  };

  const saveIncrementSetting = async (value: number): Promise<number | null> => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario_avancado')
        .update({ incremento_minimo: value, configuracao_inicial: true })
        .eq('id', exercise.id);

      if (error) throw error;

      // Round current weight to nearest valid multiple if weight exists
      if (exercise.peso && exercise.peso > 0) {
        const previousIncrement = exercise.incremento_minimo || 0;
        let roundedWeight: number;
        if (previousIncrement && value > previousIncrement) {
          roundedWeight = Math.ceil(exercise.peso / value) * value;
        } else {
          roundedWeight = Math.round(exercise.peso / value) * value;
        }
        if (roundedWeight !== exercise.peso) {
          await supabase
            .from('exercicios_treino_usuario_avancado')
            .update({ peso: roundedWeight })
            .eq('id', exercise.id);
        }
      }

      // Propagate to future exercises in same program
      const { data: currentWorkout } = await supabase
        .from('treinos_usuario')
        .select('programa_usuario_id')
        .eq('id', exercise.treino_usuario_id)
        .single();

      if (currentWorkout) {
        const { data: workouts } = await supabase
          .from('treinos_usuario')
          .select('id')
          .eq('programa_usuario_id', currentWorkout.programa_usuario_id);

        if (workouts) {
          const workoutIds = workouts.map(w => w.id);
          let updateQuery = supabase
            .from('exercicios_treino_usuario_avancado')
            .update({ incremento_minimo: value, configuracao_inicial: true })
            .eq('concluido', false)
            .in('treino_usuario_id', workoutIds)
            .neq('id', exercise.id);

          if (exercise.card_original_id) {
            updateQuery = updateQuery.eq('card_original_id', exercise.card_original_id);
          } else if (exercise.exercicio_original_id) {
            updateQuery = updateQuery.eq('exercicio_original_id', exercise.exercicio_original_id);
          }

          await updateQuery;
        }
      }

      setIncrementDialogShown(true);
      toast.success("Incremento salvo com sucesso");
      return value;
    } catch (error) {
      console.error('Error saving increment:', error);
      toast.error("Erro ao salvar incremento");
      return null;
    }
  };

  return {
    isOpen,
    setIsOpen,
    observation,
    setObservation,
    showObservationInput,
    setShowObservationInput,
    sets,
    setSets,
    originalSetCount,
    addSet,
    removeSet,
    showIncrementDialog,
    setShowIncrementDialog,
    saveIncrementSetting,
    resetIncrementDialogShown
  };
};
