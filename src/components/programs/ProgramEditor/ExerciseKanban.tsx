
import { useState, useEffect, useCallback } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DayColumn } from "./DayColumn";
import MuscleGroupDialog from "./MuscleGroupDialog";
import type { Exercise, ExerciseKanbanProps } from "./types";
import { useExerciseState } from "./hooks/useExerciseState";
import { useExerciseDrag } from "./hooks/useExerciseDrag";
import { getDayRows } from "./hooks/useScheduleHelpers";

interface ExtendedExerciseKanbanProps extends ExerciseKanbanProps {
  initialExercises?: Record<string, Exercise[]>;
}

export default function ExerciseKanban({
  weeklyFrequency,
  daysSchedule,
  currentMesocycle,
  totalMesocycles,
  mesocycleDuration = 4,
  onDurationChange,
  onExercisesUpdate,
  initialExercises = {},
}: ExtendedExerciseKanbanProps) {
  const schedule =
    daysSchedule.length > 0
      ? daysSchedule[0]
      : Array(weeklyFrequency)
          .fill("")
          .map((_, i) => `dia${i + 1}`);

  const {
    exercises,
    setAllExercises,
    dayTitles,
    updateDayTitle,
    addExercise,
    deleteExercise,
    updateExercise,
    initializeExercises,
  } = useExerciseState(schedule, initialExercises);

  const { onDragEnd } = useExerciseDrag(exercises, setAllExercises);

  const [muscleGroupDialogOpen, setMuscleGroupDialogOpen] = useState(false);
  const [currentDay, setCurrentDay] = useState<string>("");
  const [lastExercisesUpdate, setLastExercisesUpdate] = useState<string>("");

  // Inicializar títulos padrão com numeração sequencial
  useEffect(() => {
    schedule.forEach((day, index) => {
      const dayNumber = index + 1;
      if (!dayTitles[day] || dayTitles[day] === `Dia ${day}`) {
        updateDayTitle(day, dayNumber.toString());
      }
    });
  }, [schedule, dayTitles, updateDayTitle]);

  // Inicializar exercícios quando initialExercises muda
  useEffect(() => {
    if (Object.keys(initialExercises).length > 0) {
      console.log('ExerciseKanban - Inicializando exercícios:', initialExercises);
      initializeExercises(initialExercises);
    }
  }, [initialExercises, initializeExercises]);

  // Criar um hash dos exercícios para evitar updates desnecessários
  const createExercisesHash = useCallback((exercisesData: Record<string, Exercise[]>) => {
    return JSON.stringify(exercisesData);
  }, []);

  // Enviar os exercícios atualizados para o componente pai - OTIMIZADO
  useEffect(() => {
    if (onExercisesUpdate && Object.keys(exercises).length > 0) {
      const exercisesHash = createExercisesHash(exercises);
      
      // Só atualizar se realmente houve mudança
      if (exercisesHash !== lastExercisesUpdate) {
        console.log('ExerciseKanban - Enviando exercícios atualizados:', exercises);
        
        // Para cada dia, enviar os exercícios atualizados
        Object.entries(exercises).forEach(([day, dayExercises]) => {
          onExercisesUpdate(day, dayExercises);
        });
        
        setLastExercisesUpdate(exercisesHash);
      }
    }
  }, [exercises, onExercisesUpdate, createExercisesHash, lastExercisesUpdate]);

  const handleAddExercise = (day: string) => {
    setCurrentDay(day);
    setMuscleGroupDialogOpen(true);
  };

  // Handles when a muscle group or multiple groups are selected:
  const handleMuscleGroupSelect = (groups: string[], isMultiple: boolean) => {
    const newExercise: Exercise = {
      id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "Novo Exercício",
      sets: 3,
      reps: 12,
      muscleGroup: groups[0],
      allowMultipleGroups: isMultiple,
      availableGroups: isMultiple ? groups : undefined,
    };
    addExercise(currentDay, newExercise);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          Mesociclo {currentMesocycle} de {totalMesocycles}
        </h3>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Duração (semanas):</label>
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
        {getDayRows(schedule).map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"
          >
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
