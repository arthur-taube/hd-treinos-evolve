
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Exercise } from "../types";

interface RepsRangeAdvanced {
  id: string;
  min_reps: number;
  max_reps: number;
}

interface SpecialMethod {
  id: string;
  nome: string;
}

interface ExerciseDetailsAdvancedProps {
  exercise: Exercise;
  repsRanges: RepsRangeAdvanced[];
  specialMethods: SpecialMethod[];
  onExerciseUpdate: (field: keyof Exercise, value: string | number | boolean) => void;
  customizerMode?: boolean;
}

const RER_OPTIONS = [
  { value: "do_microciclo", label: "Do microciclo" },
  { value: "Falha", label: "Falha" },
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const FEEDBACK_OPTIONS = [
  { value: "ARA/ART", label: "ARA/ART" },
  { value: "AMP", label: "AMP" },
];

export function ExerciseDetailsAdvanced({
  exercise,
  repsRanges,
  specialMethods,
  onExerciseUpdate,
  customizerMode = false,
}: ExerciseDetailsAdvancedProps) {
  const formatRepsRange = (range: RepsRangeAdvanced) => {
    if (range.min_reps === range.max_reps) {
      return `${range.min_reps}`;
    }
    return `${range.min_reps}-${range.max_reps}`;
  };

  return (
    <div className="space-y-2">
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

      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">RER</p>
          <Select
            value={exercise.rer || "do_microciclo"}
            onValueChange={(value) => onExerciseUpdate('rer', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Método</p>
          <Select
            value={exercise.specialMethod || "nenhum"}
            onValueChange={(value) => onExerciseUpdate('specialMethod', value === "nenhum" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Nenhum</SelectItem>
              {specialMethods.map((method) => (
                <SelectItem key={method.id} value={method.nome}>
                  {method.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Feedback</p>
          <Select
            value={exercise.feedbackModel || "ARA/ART"}
            onValueChange={(value) => onExerciseUpdate('feedbackModel', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEEDBACK_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
