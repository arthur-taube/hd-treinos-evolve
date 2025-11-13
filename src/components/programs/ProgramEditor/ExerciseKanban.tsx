
import { useState, useEffect, useCallback, useRef } from "react";
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
  onDayTitlesUpdate?: (dayTitles: Record<string, string>) => void;
  initialDayTitles?: Record<string, string>;
  mode?: 'edit' | 'customize';
  onShowDayHiddenExercises?: (dayId: string) => void;
  onDeleteExercise?: (dayId: string, exerciseId: string) => void;
  maxSets?: number;
  onMoveExerciseBetweenDays?: (sourceDay: string, destDay: string, exercise: Exercise) => void;
  onReorderDays?: () => void;
}

export default function ExerciseKanban({
  weeklyFrequency,
  daysSchedule,
  currentMesocycle,
  totalMesocycles,
  mesocycleDuration = 4,
  onDurationChange,
  onExercisesUpdate,
  onDayTitlesUpdate,
  initialExercises = {},
  initialDayTitles = {},
  mode = 'edit',
  onShowDayHiddenExercises,
  onDeleteExercise,
  maxSets,
  onMoveExerciseBetweenDays,
  onReorderDays,
}: ExtendedExerciseKanbanProps) {
  const schedule = Array(weeklyFrequency)
    .fill("")
    .map((_, i) => `day${i + 1}`);

  const {
    exercises,
    setAllExercises,
    dayTitles,
    updateDayTitle,
    addExercise,
    deleteExercise,
    updateExercise,
    initializeExercises,
  } = useExerciseState(schedule, initialExercises, initialDayTitles);

  const { onDragEnd } = useExerciseDrag(exercises, setAllExercises);

  const [muscleGroupDialogOpen, setMuscleGroupDialogOpen] = useState(false);
  const [currentDay, setCurrentDay] = useState<string>("");
  
  // Use refs to track state without causing re-renders
  const lastReceivedHashRef = useRef<string>("");
  const lastSentHashRef = useRef<string>("");
  const isInitializingRef = useRef<boolean>(false);

  // Criar um hash dos exercícios para detectar mudanças
  const createExercisesHash = useCallback((exercisesData: Record<string, Exercise[]>) => {
    return JSON.stringify(exercisesData);
  }, []);

  // Debug logs
  console.log('🔧 ExerciseKanban - Configuração:', {
    weeklyFrequency,
    schedule,
    initialDayTitles,
    dayTitles,
    exercises: Object.keys(exercises)
  });

  // Enviar dayTitles para o componente pai sempre que mudarem
  useEffect(() => {
    if (onDayTitlesUpdate && Object.keys(dayTitles).length > 0) {
      onDayTitlesUpdate(dayTitles);
    }
  }, [dayTitles, onDayTitlesUpdate]);

  // Inicializar exercícios quando initialExercises muda
  useEffect(() => {
    const initialExercisesHash = createExercisesHash(initialExercises);
    
    if (Object.keys(initialExercises).length > 0 && 
        initialExercisesHash !== lastReceivedHashRef.current &&
        !isInitializingRef.current) {
      
      console.log('ExerciseKanban - Inicializando exercícios:', initialExercises);
      isInitializingRef.current = true;
      lastReceivedHashRef.current = initialExercisesHash;
      
      initializeExercises(initialExercises);
      
      // Reset initialization flag after a brief delay
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100);
    }
  }, [initialExercises, initializeExercises, createExercisesHash]);


  // Enviar atualizações apenas quando houver mudanças reais (evita loop infinito)
  useEffect(() => {
    if (onExercisesUpdate && Object.keys(exercises).length > 0 && !isInitializingRef.current) {
      const exercisesHash = createExercisesHash(exercises);
      
      // Só notificar se realmente houve mudança e não estamos inicializando
      if (exercisesHash !== lastSentHashRef.current && 
          exercisesHash !== lastReceivedHashRef.current) {
        
        console.log('ExerciseKanban - Enviando exercícios atualizados:', exercises);
        
        // Enviar apenas os dias que mudaram
        Object.entries(exercises).forEach(([day, dayExercises]) => {
          onExercisesUpdate(day, dayExercises);
        });
        
        lastSentHashRef.current = exercisesHash;
      }
    }
  }, [exercises, onExercisesUpdate, createExercisesHash]);

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

  // Get count of hidden exercises for a specific day
  const getHiddenExercisesCount = (day: string): number => {
    return (exercises[day] || []).filter(ex => ex.hidden === true).length;
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
                title={dayTitles[day] || `Treino ${day.replace('day', '')}`}
                exercises={exercises[day] || []}
                onTitleChange={(title) => updateDayTitle(day, title)}
                onAddExercise={() => 
                  mode === 'customize' && onShowDayHiddenExercises
                    ? onShowDayHiddenExercises(day)
                    : handleAddExercise(day)
                }
                onExerciseUpdate={(exerciseId, field, value) =>
                  updateExercise(day, exerciseId, field, value)
                }
                onDeleteExercise={(exerciseId) => 
                  onDeleteExercise ? onDeleteExercise(day, exerciseId) : deleteExercise(day, exerciseId)
                }
                maxSets={maxSets}
                mode={mode}
                hiddenExercisesCount={getHiddenExercisesCount(day)}
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
