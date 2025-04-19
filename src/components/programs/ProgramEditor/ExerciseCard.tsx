
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Grip, X } from "lucide-react";
import { Exercise } from "./types";

interface ExerciseCardProps {
  exercise: Exercise;
  provided: any;
  onDelete: () => void;
  onExerciseUpdate: (field: keyof Exercise, value: string | number) => void;
}

export function ExerciseCard({
  exercise,
  provided,
  onDelete,
  onExerciseUpdate,
}: ExerciseCardProps) {
  const muscleGroups = [
    "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", 
    "Quadríceps", "Posteriores", "Panturrilhas", "Abdômen", "Trapézio"
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3">
        <div className="flex justify-between items-center">
          <Select
            value={exercise.muscleGroup}
            onValueChange={(value) => onExerciseUpdate('muscleGroup', value)}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue placeholder="Grupo muscular" />
            </SelectTrigger>
            <SelectContent>
              {exercise.allowMultipleGroups && exercise.availableGroups ? (
                exercise.availableGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))
              ) : (
                muscleGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <div {...provided.dragHandleProps} className="cursor-grab p-1">
              <Grip className="h-3 w-3" />
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Eye className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-destructive hover:text-destructive/80"
              onClick={onDelete}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <Input
          className="mt-2"
          value={exercise.name}
          onChange={(e) => onExerciseUpdate('name', e.target.value)}
          placeholder="Nome do exercício"
        />
      </CardHeader>
      <CardContent className="p-3 pt-0 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Séries</p>
          <Input
            type="number"
            min={1}
            value={exercise.sets}
            onChange={(e) => onExerciseUpdate('sets', Number(e.target.value))}
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Repetições</p>
          <Input
            type="number"
            min={1}
            value={exercise.reps}
            onChange={(e) => onExerciseUpdate('reps', Number(e.target.value))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
