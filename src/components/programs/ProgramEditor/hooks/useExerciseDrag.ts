
import type { Exercise } from "../types";

/**
 * Handles drag-and-drop logic given the current exercises state.
 */
export function useExerciseDrag(exercises: Record<string, Exercise[]>, setAllExercises: (exs: Record<string, Exercise[]>) => void) {
  function onDragEnd(result: any) {
    const { destination, source } = result;

    if (
      !destination ||
      (destination.droppableId === source.droppableId && destination.index === source.index)
    ) {
      return;
    }

    const sourceDay = source.droppableId;
    const destinationDay = destination.droppableId;

    // Clone existing exercises
    const newExercises = { ...exercises };

    if (sourceDay === destinationDay) {
      const dayExercises = [...newExercises[sourceDay]];
      const [movedExercise] = dayExercises.splice(source.index, 1);
      dayExercises.splice(destination.index, 0, movedExercise);

      newExercises[sourceDay] = dayExercises;
    } else {
      const sourceExercises = [...newExercises[sourceDay]];
      const destinationExercises = [...newExercises[destinationDay]];

      const [movedExercise] = sourceExercises.splice(source.index, 1);
      destinationExercises.splice(destination.index, 0, movedExercise);

      newExercises[sourceDay] = sourceExercises;
      newExercises[destinationDay] = destinationExercises;
    }

    setAllExercises(newExercises);
  }

  return { onDragEnd };
}
