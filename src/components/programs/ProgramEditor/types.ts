
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  muscleGroup: string;
  allowMultipleGroups?: boolean;
  availableGroups?: string[];
}

export interface ExerciseKanbanProps {
  weeklyFrequency: number;
  daysSchedule: string[][];
  currentMesocycle: number;
  totalMesocycles: number;
  mesocycleDuration?: number;
  onDurationChange?: (duration: number) => void;
}
