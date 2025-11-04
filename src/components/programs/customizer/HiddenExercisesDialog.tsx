import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { Exercise } from "../ProgramEditor/types";

interface HiddenExercisesDialogProps {
  open: boolean;
  onClose: () => void;
  hiddenExercises: Array<{ dayId: string; exercise: Exercise }>;
  onAddExercise: (dayId: string, exercise: Exercise) => void;
}

export function HiddenExercisesDialog({
  open,
  onClose,
  hiddenExercises,
  onAddExercise,
}: HiddenExercisesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exercícios Extras Disponíveis</DialogTitle>
          <DialogDescription>
            Adicione exercícios extras ao seu programa
          </DialogDescription>
        </DialogHeader>

        {hiddenExercises.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Não há exercícios extras disponíveis para adicionar
          </div>
        ) : (
          <div className="space-y-3">
            {hiddenExercises.map(({ dayId, exercise }, index) => (
              <Card key={`${dayId}-${exercise.id}`} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Exercício Extra {index + 1}</h4>
                      <Badge variant="outline">{exercise.muscleGroup}</Badge>
                    </div>
                    <p className="text-sm font-semibold">{exercise.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {exercise.sets} séries × {exercise.reps} reps
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onAddExercise(dayId, exercise);
                      onClose();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
