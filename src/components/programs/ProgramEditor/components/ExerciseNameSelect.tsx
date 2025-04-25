
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Exercise } from "../types";

interface ExerciseNameSelectProps {
  exercise: Exercise;
  exercises: Array<{ nome: string }>;
  isLoading: boolean;
  onExerciseUpdate: (field: keyof Exercise, value: string | number | boolean) => void;
}

export function ExerciseNameSelect({
  exercise,
  exercises,
  isLoading,
  onExerciseUpdate,
}: ExerciseNameSelectProps) {
  return (
    <Select
      value={exercise.name}
      onValueChange={(value) => onExerciseUpdate('name', value)}
    >
      <SelectTrigger className="mt-2">
        <SelectValue placeholder="Selecione um exercício" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-[200px]">
          {isLoading ? (
            <SelectItem disabled value="loading">Carregando exercícios...</SelectItem>
          ) : exercises.length > 0 ? (
            exercises.map((ex) => (
              <SelectItem key={ex.nome} value={ex.nome}>
                {ex.nome}
              </SelectItem>
            ))
          ) : (
            <SelectItem disabled value="empty">
              Nenhum exercício encontrado para {exercise.muscleGroup}
            </SelectItem>
          )}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}
