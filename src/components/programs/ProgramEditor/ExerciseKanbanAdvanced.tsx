
import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DayColumnAdvanced } from "./DayColumnAdvanced";
import MuscleGroupDialogAdvanced from "./MuscleGroupDialogAdvanced";
import type { Exercise, ExerciseKanbanProps } from "./types";
import { useExerciseState } from "./hooks/useExerciseState";
import { useExerciseDrag } from "./hooks/useExerciseDrag";
import { getDayRows } from "./hooks/useScheduleHelpers";

const RER_PER_WEEK_OPTIONS = [
  "5", "4-5", "4", "3-4", "3", "2-3", "2", "1-2", "1", "0-1", "0", "0-Falha", "Falha"
];

interface ExtendedExerciseKanbanAdvancedProps extends ExerciseKanbanProps {
  initialExercises?: Record<string, Exercise[]>;
  onDayTitlesUpdate?: (dayTitles: Record<string, string>) => void;
  initialDayTitles?: Record<string, string>;
  mode?: 'edit' | 'customize';
  onShowDayHiddenExercises?: (dayId: string) => void;
  onDeleteExercise?: (dayId: string, exerciseId: string) => void;
  maxSets?: number;
  onMoveExerciseBetweenDays?: (sourceDay: string, destDay: string, exercise: Exercise) => void;
  onReorderDays?: () => void;
  onRerPerWeekUpdate?: (rerPerWeek: Record<number, string>) => void;
  initialRerPerWeek?: Record<number, string>;
  customizerMode?: boolean;
}

export default function ExerciseKanbanAdvanced({
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
  onRerPerWeekUpdate,
  initialRerPerWeek = {},
}: ExtendedExerciseKanbanAdvancedProps) {
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
  const [rerPerWeek, setRerPerWeek] = useState<Record<number, string>>(initialRerPerWeek);
  
  const lastReceivedHashRef = useRef<string>("");
  const lastSentHashRef = useRef<string>("");
  const isInitializingRef = useRef<boolean>(false);

  const createExercisesHash = useCallback((exercisesData: Record<string, Exercise[]>) => {
    return JSON.stringify(exercisesData);
  }, []);

  // Sync rerPerWeek with parent
  useEffect(() => {
    if (onRerPerWeekUpdate && Object.keys(rerPerWeek).length > 0) {
      onRerPerWeekUpdate(rerPerWeek);
    }
  }, [rerPerWeek, onRerPerWeekUpdate]);

  // Initialize rerPerWeek from props
  useEffect(() => {
    if (Object.keys(initialRerPerWeek).length > 0) {
      setRerPerWeek(initialRerPerWeek);
    }
  }, [initialRerPerWeek]);

  const handleRerWeekChange = (week: number, value: string) => {
    setRerPerWeek(prev => ({ ...prev, [week]: value }));
  };

  useEffect(() => {
    if (onDayTitlesUpdate && Object.keys(dayTitles).length > 0) {
      onDayTitlesUpdate(dayTitles);
    }
  }, [dayTitles, onDayTitlesUpdate]);

  useEffect(() => {
    const initialExercisesHash = createExercisesHash(initialExercises);
    
    if (Object.keys(initialExercises).length > 0 && 
        initialExercisesHash !== lastReceivedHashRef.current &&
        !isInitializingRef.current) {
      
      isInitializingRef.current = true;
      lastReceivedHashRef.current = initialExercisesHash;
      initializeExercises(initialExercises);
      
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100);
    }
  }, [initialExercises, initializeExercises, createExercisesHash]);

  useEffect(() => {
    if (onExercisesUpdate && Object.keys(exercises).length > 0 && !isInitializingRef.current) {
      const exercisesHash = createExercisesHash(exercises);
      
      if (exercisesHash !== lastSentHashRef.current && 
          exercisesHash !== lastReceivedHashRef.current) {
        
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

  const handleMuscleGroupSelect = (groups: string[], isMultiple: boolean) => {
    const newExercise: Exercise = {
      id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "Novo Exercício",
      sets: 3,
      reps: 12,
      muscleGroup: groups[0],
      allowMultipleGroups: isMultiple,
      availableGroups: isMultiple ? groups : undefined,
      rer: "do_microciclo",
      feedbackModel: "ARA/ART",
    };
    addExercise(currentDay, newExercise);
  };

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

      {/* RER per week selectors */}
      <div className="bg-muted/30 p-4 rounded-lg space-y-2">
        <p className="text-sm font-medium">RER alvo por semana</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: mesocycleDuration }, (_, i) => i + 1).map((week) => (
            <div key={week} className="space-y-1">
              <p className="text-xs text-muted-foreground">Sem. {week}</p>
              <Select
                value={rerPerWeek[week] || ""}
                onValueChange={(value) => handleRerWeekChange(week, value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {RER_PER_WEEK_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {getDayRows(schedule).map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"
          >
            {row.map((day) => (
              <DayColumnAdvanced
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

      <MuscleGroupDialogAdvanced
        open={muscleGroupDialogOpen}
        onClose={() => setMuscleGroupDialogOpen(false)}
        onSelect={handleMuscleGroupSelect}
      />
    </div>
  );
}
