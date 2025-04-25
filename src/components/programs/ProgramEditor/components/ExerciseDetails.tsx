
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Exercise } from "../types";
import { RepsRange } from "../types";

interface ExerciseDetailsProps {
  exercise: Exercise;
  repsRanges: RepsRange[];
  onExerciseUpdate: (field: keyof Exercise, value: string | number | boolean) => void;
}

export function ExerciseDetails({
  exercise,
  repsRanges,
  onExerciseUpdate,
}: ExerciseDetailsProps) {
  const formatRepsRange = (range: RepsRange) => {
    if (range.min_reps === range.max_reps) {
      return `${range.min_reps}`;
    }
    return `${range.min_reps}-${range.max_reps}`;
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Séries</p>
        <Select
          value={String(exercise.sets)}
          onValueChange={(value) => onExerciseUpdate('sets', Number(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((num) => (
              <SelectItem key={num} value={String(num)}>
                {num}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Repetições</p>
        <Select
          value={exercise.reps ? String(exercise.reps) : ""}
          onValueChange={(value) => onExerciseUpdate('reps', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {repsRanges.map((range) => {
              const displayValue = formatRepsRange(range);
              const storeValue = range.min_reps === range.max_reps 
                ? String(range.min_reps) 
                : `${range.min_reps}-${range.max_reps}`;
              
              return (
                <SelectItem key={range.id} value={storeValue}>
                  {displayValue}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
