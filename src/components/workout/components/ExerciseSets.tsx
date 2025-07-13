
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Target } from "lucide-react";
import { SetData, SeriesData } from "../hooks/useExerciseState";
import { useEffect } from "react";

interface ExerciseSetsProps {
  sets: SetData[];
  previousSeries: SeriesData[];
  isLoadingSeries: boolean;
  handleSetComplete: (index: number) => void;
  handleWeightChange: (index: number, weight: number) => void;
  handleRepsChange: (index: number, reps: number) => void;
  showNoteInput: boolean;
  setShowNoteInput: (show: boolean) => void;
  exerciseNote: string;
  setExerciseNote: (note: string) => void;
  addNote: () => void;
  handleExerciseComplete: () => void;
  allSetsCompleted: boolean;
  exerciseConcluido: boolean;
  exercise?: {
    peso: number | null;
    reps_programadas?: number | null;
    repeticoes?: string | null;
  };
}

export function ExerciseSets({
  sets,
  previousSeries,
  isLoadingSeries,
  handleSetComplete,
  handleWeightChange,
  handleRepsChange,
  showNoteInput,
  setShowNoteInput,
  exerciseNote,
  setExerciseNote,
  addNote,
  handleExerciseComplete,
  allSetsCompleted,
  exerciseConcluido,
  exercise
}: ExerciseSetsProps) {
  // Pré-preencher os campos com valores sugeridos
  const suggestedWeight = exercise?.peso || 0;
  const suggestedReps = exercise?.reps_programadas || 
    (exercise?.repeticoes ? parseInt(exercise.repeticoes.split('-')[0]) : 10);

  const hasProgressionData = suggestedWeight > 0 || (exercise?.reps_programadas && exercise.reps_programadas > 0);

  return (
    <div className="px-4 py-2">
      {/* Indicador de progressão aplicada */}
      {hasProgressionData && (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-600" />
            <h4 className="text-sm font-medium text-green-800">Valores Sugeridos pela Progressão</h4>
          </div>
          <div className="text-sm text-green-700">
            {suggestedWeight > 0 && (
              <span>Carga: <strong>{suggestedWeight}kg</strong></span>
            )}
            {suggestedWeight > 0 && exercise?.reps_programadas && <span> • </span>}
            {exercise?.reps_programadas && (
              <span>Repetições: <strong>{exercise.reps_programadas} reps</strong></span>
            )}
          </div>
        </div>
      )}

      {previousSeries.length > 0 && (
        <div className="mb-4 p-3 rounded-md bg-slate-600">
          <h4 className="text-sm font-medium mb-2">Histórico recente:</h4>
          <div className="space-y-1">
            {previousSeries.map((seriesData, idx) => (
              <p key={idx} className="text-sm">
                {seriesData.date}: <span className="font-medium">{seriesData.weight}kg</span> x {seriesData.reps} reps
              </p>
            ))}
          </div>
        </div>
      )}
      
      {isLoadingSeries && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Carregando histórico...
        </div>
      )}
    
      <div className="grid grid-cols-4 gap-2 mb-2 text-sm font-medium text-muted-foreground">
        <div>Série</div>
        <div>Carga</div>
        <div>Reps</div>
        <div></div>
      </div>
      
      {sets.map((set, index) => (
        <div key={index} className={`grid grid-cols-4 gap-2 items-center py-2 ${index !== sets.length - 1 ? "border-b" : ""}`}>
          <div>{set.number}</div>
          <div className="flex items-center">
            <Input 
              type="number" 
              value={set.weight || (index === 0 && suggestedWeight > 0 ? suggestedWeight : "")} 
              onChange={(e) => handleWeightChange(index, Number(e.target.value))} 
              min={0} 
              step={1} 
              className={`w-20 h-8 text-sm ${
                index === 0 && suggestedWeight > 0 && (set.weight === null || set.weight === suggestedWeight) 
                ? "border-green-500 bg-green-50" 
                : ""
              }`}
              placeholder={suggestedWeight > 0 ? suggestedWeight.toString() : ""}
            />
            <span className="ml-1 text-sm">kg</span>
          </div>
          <div>
            <Input 
              type="number" 
              value={set.reps || (exercise?.reps_programadas ? exercise.reps_programadas : "")} 
              onChange={(e) => handleRepsChange(index, Number(e.target.value))} 
              min={0} 
              step={1} 
              className={`w-20 h-8 text-sm ${
                exercise?.reps_programadas && (set.reps === null || set.reps === exercise.reps_programadas)
                ? "border-blue-500 bg-blue-50" 
                : ""
              }`}
              placeholder={exercise?.reps_programadas ? exercise.reps_programadas.toString() : ""}
            />
          </div>
          <div className="flex justify-center">
            <Button 
              variant={set.completed ? "default" : "outline"} 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => handleSetComplete(index)}
            >
              {set.completed ? <Check className="h-4 w-4" /> : null}
            </Button>
          </div>
        </div>
      ))}
      
      <div className="mt-4 space-y-4">
        {showNoteInput ? (
          <div className="space-y-2">
            <Input 
              placeholder="Digite sua anotação sobre este exercício" 
              value={exerciseNote} 
              onChange={(e) => setExerciseNote(e.target.value)} 
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowNoteInput(false)}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={addNote}>
                Salvar nota
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="text-sm" 
            onClick={() => setShowNoteInput(true)}
          >
            Adicionar nota
          </Button>
        )}
        
        <Button 
          className="w-full" 
          disabled={exerciseConcluido} 
          onClick={handleExerciseComplete}
        >
          {allSetsCompleted ? "Todas séries concluídas" : "Concluir exercício"}
        </Button>
      </div>
    </div>
  );
}
