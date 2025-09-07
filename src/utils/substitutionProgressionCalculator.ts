/**
 * Handles progression calculation for substituted exercises
 * When an exercise is temporarily substituted, only fatigue should influence series progression
 * Load and reps should remain unchanged from the original exercise
 */

export interface ProgressionData {
  exerciseId: string;
  difficultyFeedback?: string;
  fatigueFeedback?: number;
  isSubstituted: boolean;
}

export interface ProgressionResult {
  newSeries?: number;
  newWeight?: number;
  newReps?: string;
  applyChanges: boolean;
}

/**
 * Calculate progression for the next week based on feedback
 * For substituted exercises, only fatigue affects series count
 */
export function calculateSubstitutionProgression(
  currentExercise: {
    series: number;
    peso: number | null;
    repeticoes: string | null;
    substituicao_neste_treino?: boolean;
  },
  feedback: ProgressionData
): ProgressionResult {
  // If exercise was substituted, only apply fatigue-based series progression
  if (feedback.isSubstituted || currentExercise.substituicao_neste_treino) {
    return calculateFatigueOnlyProgression(currentExercise, feedback.fatigueFeedback);
  }

  // For non-substituted exercises, use normal progression logic
  return calculateNormalProgression(currentExercise, feedback);
}

/**
 * For substituted exercises: only fatigue influences series progression
 * Weight and reps remain unchanged
 */
function calculateFatigueOnlyProgression(
  currentExercise: {
    series: number;
    peso: number | null;
    repeticoes: string | null;
  },
  fatigueFeedback?: number
): ProgressionResult {
  let newSeries = currentExercise.series;

  // Apply fatigue-based series adjustment
  if (fatigueFeedback !== undefined) {
    if (fatigueFeedback <= 2) {
      // Low fatigue: can handle more series
      newSeries = Math.min(currentExercise.series + 1, 5);
    } else if (fatigueFeedback >= 4) {
      // High fatigue: reduce series
      newSeries = Math.max(currentExercise.series - 1, 1);
    }
    // Moderate fatigue (3): keep series the same
  }

  return {
    newSeries: newSeries !== currentExercise.series ? newSeries : undefined,
    newWeight: undefined, // Never change weight for substituted exercises
    newReps: undefined,   // Never change reps for substituted exercises
    applyChanges: newSeries !== currentExercise.series
  };
}

/**
 * Normal progression logic for non-substituted exercises
 * This would include the full progression calculation logic
 */
function calculateNormalProgression(
  currentExercise: {
    series: number;
    peso: number | null;
    repeticoes: string | null;
  },
  feedback: ProgressionData
): ProgressionResult {
  // This would contain the existing progression logic
  // For now, return no changes as the existing logic is handled elsewhere
  return {
    applyChanges: false
  };
}

/**
 * Check if an exercise should use substitution progression
 */
export function shouldUseSubstitutionProgression(exercise: {
  substituicao_neste_treino?: boolean;
  substituto_oficial_id?: string | null;
  substituto_custom_id?: string | null;
  substituto_nome?: string | null;
}): boolean {
  return !!(
    exercise.substituicao_neste_treino &&
    (exercise.substituto_oficial_id || exercise.substituto_custom_id || exercise.substituto_nome)
  );
}
