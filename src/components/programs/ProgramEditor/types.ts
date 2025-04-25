
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps?: number | string; // Permitir string para faixas
  allowMultipleGroups?: boolean;
  availableGroups?: string[];
  hidden?: boolean; // Propriedade para controlar visibilidade
}

export interface ExerciseKanbanProps {
  weeklyFrequency: number;
  daysSchedule: string[][];
  currentMesocycle: number;
  totalMesocycles: number;
  mesocycleDuration?: number;
  onDurationChange?: (duration: number) => void;
  onExercisesUpdate?: (dayId: string, exercises: Exercise[]) => void;
}

export interface RepsRange {
  id: string;
  min_reps: number;
  max_reps: number;
  tipo: string;
}
