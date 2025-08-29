

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Target } from "lucide-react";
import { SetData, SeriesData } from "../hooks/useExerciseState";

interface ExerciseSetsProps {
  sets: SetData[];
  previousSeries: SeriesData[];
  isLoadingSeries: boolean;
  handleSetComplete: (index: number) => void;
  handleWeightChange: (index: number, value: string) => void;
  handleRepsChange: (index: number, reps: number) => void;
  handleWeightFocus: (index: number, suggestedWeight: number) => void;
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
  handleWeightFocus,
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
  // Get suggested values from progression or exercise data
  const suggestedWeight = exercise?.peso !== undefined && exercise?.peso !== null ? exercise.peso : 0;
  
  // Determine suggested reps based on progression type
  let suggestedReps: number;
  
  if (exercise?.reps_programadas && exercise.reps_programadas > 0) {
    // Double progression - use calculated reps_programadas
    suggestedReps = exercise.reps_programadas;
    console.log(`Using reps_programadas for suggestion: ${suggestedReps}`);
  } else if (exercise?.repeticoes && !exercise.repeticoes.includes('-')) {
    // Linear progression - fixed reps
    suggestedReps = parseInt(exercise.repeticoes);
    console.log(`Using fixed repeticoes for suggestion: ${suggestedReps}`);
  } else if (exercise?.repeticoes && exercise.repeticoes.includes('-')) {
    // Range - use minimum value for display but this should use reps_programadas
    const minReps = parseInt(exercise.repeticoes.split('-')[0]);
    suggestedReps = exercise?.reps_programadas || minReps;
    console.log(`Using range repeticoes, suggesting: ${suggestedReps}`);
  } else {
    // Fallback
    suggestedReps = 10;
    console.log(`Using fallback reps: ${suggestedReps}`);
  }

  const hasProgressionData = (suggestedWeight !== undefined && suggestedWeight !== null) || suggestedReps > 0;

  // Determine progression type for display
  const isDoubleProgression = exercise?.repeticoes && exercise.repeticoes.includes('-');
  const progressionType = isDoubleProgression ? 'dupla' : 'linear';

  return (
    <div className="px-4 py-2">
      {/* Indicador de progressão aplicada */}
      {hasProgressionData && (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-600" />
            <h4 className="text-sm font-medium text-green-800">
              Valores Sugeridos pela Progressão ({progressionType})
            </h4>
          </div>
          <div className="text-sm text-green-700">
            <span>Carga: <strong>{suggestedWeight}kg</strong></span>
            <span> • </span>
            <span>
              {isDoubleProgression ? (
                <>Meta: <strong>{suggestedReps} reps</strong> (dentro da faixa {exercise?.repeticoes})</>
              ) : (
                <>Repetições: <strong>{suggestedReps} reps</strong></>
              )}
            </span>
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
        <div>Concluir</div>
      </div>
      
      {sets.map((set, index) => {
        // Use the set's actual values if they exist, otherwise empty for placeholder behavior
        const displayWeight = set.weight !== null ? set.weight.toString() : '';
        const displayReps = set.reps !== null ? set.reps.toString() : '';
        const placeholderWeight = suggestedWeight.toString();
        const placeholderReps = suggestedReps.toString();

        return (
          <div key={index} className={`grid grid-cols-4 gap-2 items-center py-2 ${index !== sets.length - 1 ? "border-b" : ""}`}>
            <div>{set.number}</div>
            <div className="flex items-center">
              <Input 
                type="number" 
                value={displayWeight}
                placeholder={placeholderWeight}
                onFocus={() => handleWeightFocus(index, suggestedWeight)}
                onChange={(e) => handleWeightChange(index, e.target.value)} 
                step={0.5} 
                className="w-20 h-8 text-sm"
              />
              <span className="ml-1 text-sm">kg</span>
            </div>
            <div>
              <Input 
                type="number" 
                value={displayReps}
                placeholder={placeholderReps}
                onChange={(e) => handleRepsChange(index, Number(e.target.value))} 
                min={0} 
                step={1} 
                className="w-20 h-8 text-sm"
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
        );
      })}
      
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
