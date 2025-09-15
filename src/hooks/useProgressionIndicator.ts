import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useProgressionIndicator(exerciseId: string, exercicioOriginalId: string) {
  const [progressionMessage, setProgressionMessage] = useState<string>('');

  useEffect(() => {
    if (exerciseId && exercicioOriginalId) {
      calculateProgressionMessage();
    }
  }, [exerciseId, exercicioOriginalId]);

  const calculateProgressionMessage = async () => {
    try {
      // Get current exercise data
      const { data: currentExercise } = await supabase
        .from('exercicios_treino_usuario')
        .select('peso, series, reps_programadas, repeticoes, treino_usuario_id')
        .eq('id', exerciseId)
        .single();

      if (!currentExercise) return;

      // Get current workout to find the program
      const { data: currentWorkout } = await supabase
        .from('treinos_usuario')
        .select('programa_usuario_id')
        .eq('id', currentExercise.treino_usuario_id)
        .single();

      if (!currentWorkout) return;

      // Get previous exercise from same program
      const { data: previousExercises } = await supabase
        .from('exercicios_treino_usuario')
        .select(`
          peso, 
          series, 
          reps_programadas, 
          repeticoes,
          treino_usuario_id,
          treinos_usuario!inner(programa_usuario_id)
        `)
        .eq('exercicio_original_id', exercicioOriginalId)
        .eq('concluido', true)
        .eq('treinos_usuario.programa_usuario_id', currentWorkout.programa_usuario_id)
        .neq('treino_usuario_id', currentExercise.treino_usuario_id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!previousExercises || previousExercises.length === 0) {
        setProgressionMessage('');
        return;
      }

      const previous = previousExercises[0];
      const current = currentExercise;

      // Compare weight
      if (current.peso && previous.peso) {
        const weightDiff = current.peso - previous.peso;
        if (weightDiff > 0) {
          setProgressionMessage(`Aumentou ${weightDiff}kg`);
          return;
        } else if (weightDiff < 0) {
          setProgressionMessage(`Diminuiu ${Math.abs(weightDiff)}kg`);
          return;
        }
      }

      // Compare reps (for double progression)
      if (current.reps_programadas && previous.reps_programadas) {
        const repsDiff = current.reps_programadas - previous.reps_programadas;
        if (repsDiff > 0) {
          const repText = repsDiff === 1 ? 'repetição' : 'repetições';
          setProgressionMessage(`Aumentou ${repsDiff} ${repText}`);
          return;
        } else if (repsDiff < 0) {
          const repText = Math.abs(repsDiff) === 1 ? 'repetição' : 'repetições';
          setProgressionMessage(`Diminuiu ${Math.abs(repsDiff)} ${repText}`);
          return;
        }
      }

      // Compare sets
      if (current.series && previous.series) {
        const setsDiff = current.series - previous.series;
        if (setsDiff > 0) {
          const setText = setsDiff === 1 ? 'série' : 'séries';
          setProgressionMessage(`Aumentou ${setsDiff} ${setText}`);
          return;
        } else if (setsDiff < 0) {
          const setText = Math.abs(setsDiff) === 1 ? 'série' : 'séries';
          setProgressionMessage(`Diminuiu ${Math.abs(setsDiff)} ${setText}`);
          return;
        }
      }

      setProgressionMessage('');
    } catch (error) {
      console.error('Error calculating progression message:', error);
      setProgressionMessage('');
    }
  };

  return progressionMessage;
}