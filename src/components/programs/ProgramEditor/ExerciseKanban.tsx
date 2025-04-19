import { useState } from "react";
import { PlusCircle, Eye, X, Grip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import MuscleGroupDialog from "./MuscleGroupDialog";

interface ExerciseKanbanProps {
  weeklyFrequency: number;
  daysSchedule: string[][];
  currentMesocycle: number;
  totalMesocycles: number;
  mesocycleDuration?: number;
  onDurationChange?: (duration: number) => void;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  muscleGroup: string;
  allowMultipleGroups?: boolean;
  availableGroups?: string[];
}

export default function ExerciseKanban({ 
  weeklyFrequency, 
  daysSchedule,
  currentMesocycle,
  totalMesocycles,
  mesocycleDuration = 4,
  onDurationChange,
}: ExerciseKanbanProps) {
  // For demo purposes, we'll use just the first schedule if available
  const schedule = daysSchedule.length > 0 ? daysSchedule[0] : Array(weeklyFrequency).fill("").map((_, i) => `dia${i+1}`);
  
  const [exercises, setExercises] = useState<Record<string, Exercise[]>>(() => {
    // Initialize with empty arrays for each day
    const initialExercises: Record<string, Exercise[]> = {};
    schedule.forEach((day) => {
      initialExercises[day] = [];
    });
    return initialExercises;
  });

  const [dayTitles, setDayTitles] = useState<Record<string, string>>(() => {
    // Initialize with default titles
    const initialTitles: Record<string, string> = {};
    schedule.forEach((day, index) => {
      initialTitles[day] = `Dia ${index + 1}`;
    });
    return initialTitles;
  });

  const addExercise = (day: string) => {
    const newExercise: Exercise = {
      id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "Novo Exercício",
      sets: 3,
      reps: 12,
      muscleGroup: "Peito"
    };

    setExercises({
      ...exercises,
      [day]: [...(exercises[day] || []), newExercise]
    });
  };

  const updateDayTitle = (day: string, title: string) => {
    setDayTitles({
      ...dayTitles,
      [day]: title
    });
  };

  const deleteExercise = (day: string, exerciseId: string) => {
    setExercises({
      ...exercises,
      [day]: exercises[day].filter(ex => ex.id !== exerciseId)
    });
  };

  const updateExercise = (day: string, exerciseId: string, field: keyof Exercise, value: string | number) => {
    setExercises({
      ...exercises,
      [day]: exercises[day].map(ex => 
        ex.id === exerciseId 
          ? { ...ex, [field]: value }
          : ex
      )
    });
  };

  const getDayLabel = (dayId: string) => {
    const dayMap: Record<string, string> = {
      "segunda": "Segunda",
      "terca": "Terça",
      "quarta": "Quarta",
      "quinta": "Quinta",
      "sexta": "Sexta",
      "sabado": "Sábado",
      "domingo": "Domingo"
    };
    return dayMap[dayId] || dayId;
  };

  // Group days into rows (max 3 columns per row)
  const getDayRows = () => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    
    schedule.forEach((day) => {
      if (currentRow.length === 3) {
        rows.push(currentRow);
        currentRow = [];
      }
      currentRow.push(day);
    });
    
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    return rows;
  };

  const muscleGroups = [
    "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", 
    "Quadríceps", "Posteriores", "Panturrilhas", "Abdômen", "Trapézio"
  ];

  // Handle drag end event
  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    // If there's no destination or the item was dropped back in the same position
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    const sourceDay = source.droppableId;
    const destinationDay = destination.droppableId;
    
    // Create a copy of the current exercises
    const newExercises = { ...exercises };
    
    // Handle reordering within the same day
    if (sourceDay === destinationDay) {
      const dayExercises = [...newExercises[sourceDay]];
      const [movedExercise] = dayExercises.splice(source.index, 1);
      dayExercises.splice(destination.index, 0, movedExercise);
      
      newExercises[sourceDay] = dayExercises;
    } 
    // Handle moving between days
    else {
      const sourceExercises = [...newExercises[sourceDay]];
      const destinationExercises = [...newExercises[destinationDay]];
      
      const [movedExercise] = sourceExercises.splice(source.index, 1);
      destinationExercises.splice(destination.index, 0, movedExercise);
      
      newExercises[sourceDay] = sourceExercises;
      newExercises[destinationDay] = destinationExercises;
    }
    
    setExercises(newExercises);
  };

  const [muscleGroupDialogOpen, setMuscleGroupDialogOpen] = useState(false);
  const [currentDay, setCurrentDay] = useState<string>("");

  const handleAddExercise = (day: string) => {
    setCurrentDay(day);
    setMuscleGroupDialogOpen(true);
  };

  const handleMuscleGroupSelect = (groups: string[], isMultiple: boolean) => {
    const newExercise: Exercise = {
      id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "Novo Exercício",
      sets: 3,
      reps: 12,
      muscleGroup: groups[0],
      allowMultipleGroups: isMultiple,
      availableGroups: isMultiple ? groups : undefined
    };

    setExercises({
      ...exercises,
      [currentDay]: [...(exercises[currentDay] || []), newExercise]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Mesociclo {currentMesocycle} de {totalMesocycles}</h3>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">
            Duração (semanas):
          </label>
          <Input
            type="number"
            min={1}
            className="w-20"
            value={mesocycleDuration}
            onChange={(e) => onDurationChange?.(Number(e.target.value))}
          />
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {getDayRows().map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {row.map((day, dayIndex) => (
              <div key={`${day}-${dayIndex}`} className="flex flex-col">
                <div className="bg-muted p-2 rounded-t-md">
                  <Input
                    value={dayTitles[day]}
                    onChange={(e) => updateDayTitle(day, e.target.value)}
                    className="font-medium text-center bg-transparent border-none focus-visible:ring-0"
                    placeholder={`Dia ${rowIndex * 3 + dayIndex + 1}`}
                  />
                  <div className="text-xs text-center text-muted-foreground mt-0.5">
                    {getDayLabel(day)}
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-b-md p-2 flex-1 min-h-[400px] flex flex-col">
                  <Button
                    variant="ghost"
                    className="flex w-full justify-center p-2 mb-2"
                    onClick={() => handleAddExercise(day)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Exercício
                  </Button>

                  <Droppable droppableId={day}>
                    {(provided) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-3 flex-1"
                      >
                        {exercises[day]?.map((exercise, index) => (
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
                                <Card className="shadow-sm">
                                  <CardHeader className="p-3">
                                    <div className="flex justify-between items-center">
                                      <Select
                                        value={exercise.muscleGroup}
                                        onValueChange={(value) => 
                                          updateExercise(day, exercise.id, 'muscleGroup', value)
                                        }
                                      >
                                        <SelectTrigger className="h-7 w-32 text-xs">
                                          <SelectValue placeholder="Grupo muscular" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {muscleGroups.map((group) => (
                                            <SelectItem key={group} value={group}>
                                              {group}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>

                                      <div className="flex gap-1">
                                        <div 
                                          {...provided.dragHandleProps} 
                                          className="cursor-grab p-1"
                                        >
                                          <Grip className="h-3 w-3" />
                                        </div>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 text-destructive hover:text-destructive/80"
                                          onClick={() => deleteExercise(day, exercise.id)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <Input
                                      className="mt-2"
                                      value={exercise.name}
                                      onChange={(e) => updateExercise(day, exercise.id, 'name', e.target.value)}
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
                                        onChange={(e) => updateExercise(day, exercise.id, 'sets', Number(e.target.value))}
                                      />
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Repetições</p>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={exercise.reps}
                                        onChange={(e) => updateExercise(day, exercise.id, 'reps', Number(e.target.value))}
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        ))}
      </DragDropContext>

      {schedule.length === 0 && (
        <div className="text-center p-4 border border-dashed rounded-md">
          <p className="text-muted-foreground">
            Defina pelo menos um cronograma de treino para visualizar o quadro Kanban
          </p>
        </div>
      )}

      <MuscleGroupDialog 
        open={muscleGroupDialogOpen}
        onClose={() => setMuscleGroupDialogOpen(false)}
        onSelect={handleMuscleGroupSelect}
      />
    </div>
  );
}
