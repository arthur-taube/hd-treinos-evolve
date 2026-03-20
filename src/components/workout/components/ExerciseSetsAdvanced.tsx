import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Plus, StickyNote } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SetDataAdvanced } from "../hooks/useExerciseStateAdvanced";
import { PreviousSeriesAdvancedData } from "../hooks/usePreviousSeriesAdvanced";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExerciseSetsAdvancedProps {
  sets: SetDataAdvanced[];
  previousSeries: PreviousSeriesAdvancedData[];
  isLoadingSeries: boolean;
  handleSetComplete: (index: number) => void;
  handleWeightChange: (index: number, value: string) => void;
  handleRepsChange: (index: number, reps: number) => void;
  handleWeightFocus: (index: number, suggestedWeight: number) => void;
  handleNoteChange: (index: number, note: string) => void;
  saveSetNote: (index: number, note: string) => void;
  handleExerciseComplete: () => void;
  allSetsCompleted: boolean;
  exerciseConcluido: boolean;
  suggestedWeight: number;
  suggestedReps: number;
  onAddSet?: () => void;
  onRemoveSet?: (index: number) => void;
  originalSetCount?: number;
}

export function ExerciseSetsAdvanced({
  sets,
  previousSeries,
  isLoadingSeries,
  handleSetComplete,
  handleWeightChange,
  handleRepsChange,
  handleWeightFocus,
  handleNoteChange,
  saveSetNote,
  handleExerciseComplete,
  allSetsCompleted,
  exerciseConcluido,
  suggestedWeight,
  suggestedReps,
  onAddSet,
  onRemoveSet,
  originalSetCount = 0,
}: ExerciseSetsAdvancedProps) {
  const [showAddSetDialog, setShowAddSetDialog] = useState(false);

  return (
    <div className="px-4 py-2">
      {/* Recent history with per-series notes */}
      {previousSeries.length > 0 && (
        <div className="mb-4 p-3 rounded-md bg-slate-600">
          <h4 className="text-sm font-medium mb-2">Histórico recente:</h4>
          <div className="space-y-2">
            {previousSeries.map((workoutData, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-sm font-medium">{workoutData.date}:</p>
                {workoutData.allSeries.map(series => (
                  <div key={series.number} className="ml-2">
                    <p className="text-sm text-muted-foreground">
                      {series.number} - <span className="font-medium">{series.weight}kg</span> x {series.reps} reps
                    </p>
                    {series.note && (
                      <p className="text-xs text-muted-foreground italic ml-4">
                        📝 {series.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoadingSeries && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Carregando histórico...
        </div>
      )}

      {/* 5-column header */}
      <div className="grid grid-cols-[40px_1fr_1fr_36px_36px] gap-1.5 mb-2 text-sm font-medium text-muted-foreground">
        <div>Série</div>
        <div>Carga</div>
        <div>Reps</div>
        <div className="text-center">📝</div>
        <div className="text-center">✓</div>
      </div>

      {/* Sets rows */}
      {sets.map((set, index) => {
        const displayWeight = set.weight !== null ? set.weight.toString() : '';
        const displayReps = set.reps !== null ? set.reps.toString() : '';
        const isExtraSet = set.number > originalSetCount;
        const canRemove = isExtraSet && !set.completed && onRemoveSet;
        const hasNote = set.note && set.note.trim().length > 0;

        return (
          <div
            key={index}
            className={`grid grid-cols-[40px_1fr_1fr_36px_36px] gap-1.5 items-center py-2 ${index !== sets.length - 1 ? "border-b" : ""}`}
          >
            <div className="text-sm">{set.number}</div>
            <div className="flex items-center">
              <Input
                type="number"
                value={displayWeight}
                placeholder={suggestedWeight.toString()}
                onFocus={() => handleWeightFocus(index, suggestedWeight)}
                onChange={e => handleWeightChange(index, e.target.value)}
                step={0.5}
                className="w-full h-8 text-sm"
              />
              <span className="ml-1 text-xs text-muted-foreground">kg</span>
            </div>
            <div>
              <Input
                type="number"
                value={displayReps}
                placeholder={suggestedReps.toString()}
                onChange={e => handleRepsChange(index, Number(e.target.value))}
                min={0}
                step={1}
                className="w-full h-8 text-sm"
              />
            </div>
            <div className="flex justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${hasNote ? 'text-amber-500' : 'text-muted-foreground'}`}
                  >
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" side="left">
                  <Input
                    placeholder="Nota para esta série..."
                    value={set.note}
                    onChange={e => handleNoteChange(index, e.target.value)}
                    onBlur={() => saveSetNote(index, set.note)}
                    maxLength={100}
                    className="text-sm"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-center">
              {canRemove ? (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => onRemoveSet(index)}>
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant={set.completed ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleSetComplete(index)}
                >
                  {set.completed ? <Check className="h-4 w-4" /> : null}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add set */}
      {!exerciseConcluido && onAddSet && (
        <button
          type="button"
          className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
          onClick={() => setShowAddSetDialog(true)}
        >
          <Plus className="h-3 w-3" />
          Adicionar mais 1 série
        </button>
      )}

      <AlertDialog open={showAddSetDialog} onOpenChange={setShowAddSetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar série extra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja realizar mais uma série para este exercício?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onAddSet?.(); setShowAddSetDialog(false); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom actions */}
      <div className="mt-4">
        <Button className="w-full" disabled={exerciseConcluido} onClick={handleExerciseComplete}>
          {allSetsCompleted ? "Todas séries concluídas" : "Concluir exercício"}
        </Button>
      </div>
    </div>
  );
}
