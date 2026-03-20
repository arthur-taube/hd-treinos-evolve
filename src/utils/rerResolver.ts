/**
 * Resolves the RER target for an exercise based on the microcycle configuration.
 * If the exercise's RER is 'do_microciclo', it looks up the value from the
 * mesocycle's rer_por_semana mapping using the current week number.
 */
export function resolveExerciseRer(
  exerciseRer: string | null,
  rerPerWeek: Record<string, string> | null,
  weekNumber: number
): string {
  if (!exerciseRer || exerciseRer === 'do_microciclo') {
    if (rerPerWeek) {
      return rerPerWeek[weekNumber.toString()] || '';
    }
    return '';
  }
  return exerciseRer;
}
