
import { useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DayColumn } from "./DayColumn";
import MuscleGroupDialog from "./MuscleGroupDialog";
import type { Exercise, ExerciseKanbanProps } from "./types";

export default function ExerciseKanban({ 
  weeklyFrequency, 
  daysSchedule,
  currentMesocycle,
  totalMesocycles,
  mesocycleDuration = 4,
  onDurationChange,
}: ExerciseKanbanProps) {
  const schedule = daysSchedule.length > 0 ? daysSchedule[0] : Array(weeklyFrequency).fill("").map((_, i) => `dia${i+1}`);
  
  const [exercises, setExercises] = useState<Record<string, Exercise[]>>(() => {
    const initialExercises: Record<string, Exercise[]> = {};
    schedule.forEach((day) => {
      initialExercises[day] = [];
    });
    return initialExercises;
  });

  const [dayTitles, setDayTitles] = useState<Record<string, string>>(() => {
    const initialTitles: Record<string, string> = {};
    schedule.forEach((day, index) => {
      initialTitles[day] = `Dia ${index + 1}`;
    });
    return initialTitles;
  });

  const [muscleGroupDialogOpen, setMuscleGroupDialogOpen] = useState(false);
  const [currentDay, setCurrentDay] = useState<string>("");

  const updateDayTitle = (day: string, title: string) => {
    setDayTitles({
      ...dayTitles,
      [day]: title
    });
  };

  const handleAddExercise = (day: string) => {
    setCurrentDay(day);
    setMuscleGroupDialogOpen(true);
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

  const onDragEnd = (result: any) => {
    const { destination, source } = result;

    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    const sourceDay = source.droppableId;
    const destinationDay = destination.droppableId;
    
    const newExercises = { ...exercises };
    
    if (sourceDay === destinationDay) {
      const dayExercises = [...newExercises[sourceDay]];
      const [movedExercise] = dayExercises.splice(source.index, 1);
      dayExercises.splice(destination.index, 0, movedExercise);
      
      newExercises[sourceDay] = dayExercises;
    } 
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
            {row.map((day) => (
              <DayColumn
                key={day}
                dayId={day}
                title={dayTitles[day]}
                exercises={exercises[day] || []}
                onTitleChange={(title) => updateDayTitle(day, title)}
                onAddExercise={() => handleAddExercise(day)}
                onExerciseUpdate={(exerciseId, field, value) => 
                  updateExercise(day, exerciseId, field, value)
                }
                onDeleteExercise={(exerciseId) => deleteExercise(day, exerciseId)}
                dayLabel={getDayLabel(day)}
              />
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
