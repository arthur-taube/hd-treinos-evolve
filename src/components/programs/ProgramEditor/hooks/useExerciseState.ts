
import { useState, useCallback } from "react";
import type { Exercise } from "../types";

/**
 * Handles exercises per day and day titles state, plus updaters.
 */
export function useExerciseState(schedule: string[], initialExercises?: Record<string, Exercise[]>) {
  const [exercises, setExercises] = useState<Record<string, Exercise[]>>(() => {
    const initialExercisesState: Record<string, Exercise[]> = {};
    schedule.forEach((day) => {
      initialExercisesState[day] = initialExercises?.[day] || [];
    });
    return initialExercisesState;
  });

  const [dayTitles, setDayTitles] = useState<Record<string, string>>(() => {
    const initialTitles: Record<string, string> = {};
    schedule.forEach((day, index) => {
      // Garantir que sempre há um título válido inicialmente
      initialTitles[day] = `${index + 1}`;
    });
    return initialTitles;
  });

  const initializeExercises = useCallback((newInitialExercises: Record<string, Exercise[]>) => {
    setExercises(prevExercises => {
      const updatedExercises: Record<string, Exercise[]> = {};
      schedule.forEach((day) => {
        updatedExercises[day] = newInitialExercises[day] || prevExercises[day] || [];
      });
      return updatedExercises;
    });
  }, [schedule]);

  const updateDayTitle = useCallback((day: string, title: string) => {
    setDayTitles((prev) => ({ ...prev, [day]: title || `Treino ${day.replace('day', '')}` }));
  }, []);

  const addExercise = useCallback((day: string, newExercise: Exercise) => {
    const defaultExercise = {
      ...newExercise,
      sets: 2,
      reps: undefined, // Iniciar com repetições em branco
      hidden: false, // Por padrão, exercícios são visíveis
    };

    setExercises((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), defaultExercise]
    }));
  }, []);

  const deleteExercise = useCallback((day: string, exerciseId: string) => {
    setExercises((prev) => ({
      ...prev,
      [day]: prev[day].filter((ex) => ex.id !== exerciseId)
    }));
  }, []);

  const updateExercise = useCallback((day: string, exerciseId: string, field: keyof Exercise, value: string | number | boolean) => {
    setExercises((prev) => ({
      ...prev,
      [day]: prev[day].map((ex) =>
        ex.id === exerciseId
          ? { ...ex, [field]: value }
          : ex
      )
    }));
  }, []);

  const setAllExercises = setExercises;

  return {
    exercises,
    setAllExercises,
    dayTitles,
    updateDayTitle,
    addExercise,
    deleteExercise,
    updateExercise,
    initializeExercises,
  };
}
