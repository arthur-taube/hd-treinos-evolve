
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import { Exercise } from "./types";
import { ExerciseCard } from "./ExerciseCard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DayColumnProps {
  dayId: string;
  title: string;
  exercises: Exercise[];
  onTitleChange: (title: string) => void;
  onAddExercise: () => void;
  onExerciseUpdate: (exerciseId: string, field: keyof Exercise, value: string | number | boolean) => void;
  onDeleteExercise: (exerciseId: string) => void;
  maxSets?: number;
  mode?: 'edit' | 'customize';
  hiddenExercisesCount?: number;
}

export function DayColumn({
  dayId,
  title,
  exercises,
  onTitleChange,
  onAddExercise,
  onExerciseUpdate,
  onDeleteExercise,
  maxSets = 5,
  mode = 'edit',
  hiddenExercisesCount = 0,
}: DayColumnProps) {
  // Proteção contra título undefined/null - usar valor padrão
  const safeTitle = title || `Treino ${dayId.replace('day', '')}`;
  
  // Extrair nome e nome personalizado do título atual
  const [workoutName, customName] = safeTitle.includes(' - ') 
    ? safeTitle.split(' - ') 
    : [safeTitle, ''];

  const handleWorkoutNameChange = (newWorkoutName: string) => {
    const newTitle = customName ? `${newWorkoutName} - ${customName}` : newWorkoutName;
    onTitleChange(newTitle);
  };

  const handleCustomNameChange = (newCustomName: string) => {
    const newTitle = newCustomName ? `${workoutName} - ${newCustomName}` : workoutName;
    onTitleChange(newTitle);
  };

  return (
    <div className="flex flex-col">
      <div className="bg-muted p-2 rounded-t-md space-y-2">
        <Input
          value={workoutName || ''}
          onChange={(e) => handleWorkoutNameChange(e.target.value)}
          className="font-medium text-center bg-transparent border-none focus-visible:ring-0"
          placeholder={`Treino ${dayId.replace('day', '')}`}
        />
        <Input
          value={customName || ''}
          onChange={(e) => handleCustomNameChange(e.target.value)}
          className="text-center bg-transparent border-none focus-visible:ring-0 text-sm"
          placeholder="Nome personalizado (opcional)"
        />
      </div>
      
      <div className="bg-muted/50 rounded-b-md p-2 flex-1 min-h-[400px] flex flex-col">
        <Droppable droppableId={dayId}>
          {(provided) => {
            // Filtrar exercícios ocultos no modo customize
            const visibleExercises = mode === 'customize' 
              ? exercises?.filter(ex => !ex.hidden) 
              : exercises;
            
            return (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-3 flex-1"
              >
                {visibleExercises?.map((exercise, index) => (
                <Draggable 
                  key={exercise.id} 
                  draggableId={exercise.id} 
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      <ExerciseCard
                        exercise={exercise}
                        provided={provided}
                        onDelete={() => onDeleteExercise(exercise.id)}
                        onExerciseUpdate={(field, value) => 
                          onExerciseUpdate(exercise.id, field, value)
                        }
                        mode={mode}
                      />
                    </div>
                  )}
                </Draggable>
                ))}
                {provided.placeholder}
              </div>
            );
          }}
        </Droppable>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  variant="ghost"
                  className="flex w-full justify-center p-2 mt-2"
                  onClick={onAddExercise}
                  disabled={mode === 'customize' && hiddenExercisesCount === 0}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Exercício
                </Button>
              </div>
            </TooltipTrigger>
            {mode === 'customize' && hiddenExercisesCount === 0 && (
              <TooltipContent>
                <p>Nenhum exercício extra disponível</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
