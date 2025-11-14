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
import { Plus, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Exercise } from "../ProgramEditor/types";

interface HiddenExercisesDialogProps {
  open: boolean;
  onClose: () => void;
  hiddenExercises: Array<{ dayId: string; exercise: Exercise }>;
  dayId?: string;
  onAddExercise: (dayId: string, exercise: Exercise) => void;
}

export function HiddenExercisesDialog({
  open,
  onClose,
  hiddenExercises,
  dayId,
  onAddExercise,
}: HiddenExercisesDialogProps) {
  // Filter exercises by day if dayId is provided
  const filteredExercises = dayId 
    ? hiddenExercises.filter(item => item.dayId === dayId)
    : hiddenExercises;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exercícios Extras Disponíveis</DialogTitle>
          <DialogDescription>
            Adicione exercícios extras ao seu programa
          </DialogDescription>
        </DialogHeader>

        {filteredExercises.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Não há exercícios extras disponíveis para adicionar
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExercises.map(({ dayId, exercise }, index) => (
              <Card key={`${dayId}-${exercise.id}`} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium">
                      Exercício Extra{filteredExercises.length > 1 ? ` ${index + 1}` : ''}
                    </h4>
                    <div className="w-fit">
                      {exercise.allowMultipleGroups && exercise.availableGroups ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="cursor-pointer">
                              <Badge variant="multi" className="flex items-center gap-1">
                                {exercise.muscleGroup}
                                <ChevronDown className="h-3 w-3" />
                              </Badge>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {exercise.availableGroups.map((group) => (
                              <DropdownMenuItem key={group}>
                                {group}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge variant="muscle">{exercise.muscleGroup}</Badge>
                      )}
                    </div>
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
