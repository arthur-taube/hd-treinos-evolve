
import { useState } from "react";
import type { Exercise } from "../types";

/**
 * Handles exercises per day and day titles state, plus updaters.
 */
export function useExerciseState(schedule: string[]) {
  const [exercises, setExercises] = useState<Record<string, Exercise[]>>(() => {
    const initialExercises: Record<string, Exercise[]> = {};
    schedule.forEach((day) => {
      initialExercises[day] = [];
    });
    return initialExercises;
  });

  const [dayTitles, setDayTitles] = useState<Record<string, string>>(() => {
    const initialTitles: Record<string, string> = {};
    schedule.forEach((day, index) => {
      initialTitles[day] = `Dia ${index + 1}`;
    });
    return initialTitles;
  });

  const updateDayTitle = (day: string, title: string) => {
    setDayTitles((prev) => ({ ...prev, [day]: title }));
  };

  const addExercise = (day: string, newExercise: Exercise) => {
    const defaultExercise = {
      ...newExercise,
      sets: 2,
      reps: undefined, // Iniciar com repetições em branco
    };

    setExercises((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), defaultExercise]
    }));
  };

  const deleteExercise = (day: string, exerciseId: string) => {
    setExercises((prev) => ({
      ...prev,
      [day]: prev[day].filter((ex) => ex.id !== exerciseId)
    }));
  };

  const updateExercise = (day: string, exerciseId: string, field: keyof Exercise, value: string | number) => {
    setExercises((prev) => ({
      ...prev,
      [day]: prev[day].map((ex) =>
        ex.id === exerciseId
          ? { ...ex, [field]: value }
          : ex
      )
    }));
  };

  const setAllExercises = setExercises;

  return {
    exercises,
    setAllExercises,
    dayTitles,
    updateDayTitle,
    addExercise,
    deleteExercise,
    updateExercise,
  };
}
