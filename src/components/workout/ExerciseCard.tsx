
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseHeader } from "./components/ExerciseHeader";
import { ExerciseObservation } from "./components/ExerciseObservation";
import { ExerciseSets } from "./components/ExerciseSets";
import { FeedbackDialog, FeedbackOption } from "./FeedbackDialog";
import { useExerciseState } from "./hooks/useExerciseState";
import { useExerciseActions } from "./hooks/useExerciseActions";
import { usePreviousSeries } from "./hooks/usePreviousSeries";
import { 
  DIFFICULTY_OPTIONS, 
  COMBINED_FATIGUE_PAIN_OPTIONS,
  INCREMENT_OPTIONS 
} from "@/hooks/use-exercise-feedback";

interface Exercise {
  id: string;
  nome: string;
  series: number;
  peso: number | null;
  repeticoes?: string | null;
  grupo_muscular: string;
  observacao?: string | null;
  concluido: boolean;
  ordem: number;
  oculto: boolean;
  exercicio_original_id: string;
  video_url?: string | null;
  primary_muscle?: string | null;
  secondary_muscle?: string | null;
  configuracao_inicial?: boolean;
  reps_programadas?: number | null;
  incremento_minimo?: number | null;
  treino_usuario_id: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>;
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>;
  muscleName?: string;
}

export function ExerciseCard({ exercise, onExerciseComplete, onWeightUpdate, muscleName }: ExerciseCardProps) {
  const exerciseState = useExerciseState(exercise, onExerciseComplete, onWeightUpdate);
  const { previousSeries, isLoadingSeries } = usePreviousSeries(exercise.id);

  const exerciseActions = useExerciseActions(
    exercise,
    exerciseState.sets,
    exerciseState.setSets,
    onExerciseComplete,
    onWeightUpdate,
    exerciseState.setIsOpen,
    exerciseState.setShowDifficultyDialog,
    exerciseState.checkIsFirstWeek
  );

  const allSetsCompleted = exerciseState.sets.every(set => set.completed);
  
  useEffect(() => {
    if (!exercise.concluido && exerciseState.checkNeedsIncrementConfiguration()) {
      exerciseState.checkInitialConfiguration();
    }
  }, [exercise.id, exercise.concluido]);

  useEffect(() => {
    if (exercise.primary_muscle) {
      exerciseState.checkNeedsPainEvaluation(exercise.primary_muscle);
    }
  }, [exercise.primary_muscle]);

  return (
    <>
      <Card className="mb-4">
        <ExerciseHeader 
          exercise={exercise}
          isOpen={exerciseState.isOpen}
          setIsOpen={exerciseState.setIsOpen}
          skipIncompleteSets={exerciseActions.skipIncompleteSets}
          replaceExerciseThisWorkout={exerciseActions.replaceExerciseThisWorkout}
          replaceExerciseAllWorkouts={exerciseActions.replaceExerciseAllWorkouts}
        />
        
        {exerciseState.isOpen && (
          <>
            <ExerciseObservation
              observation={exerciseState.observation}
              setObservation={exerciseState.setObservation}
              showObservationInput={exerciseState.showObservationInput}
              setShowObservationInput={exerciseState.setShowObservationInput}
              saveObservation={exerciseActions.saveObservation}
            />
            
            <ExerciseSets
              sets={exerciseState.sets}
              previousSeries={previousSeries}
              isLoadingSeries={isLoadingSeries}
              handleSetComplete={exerciseActions.handleSetComplete}
              handleWeightChange={exerciseActions.handleWeightChange}
              handleRepsChange={exerciseActions.handleRepsChange}
              showNoteInput={exerciseState.showNoteInput}
              setShowNoteInput={exerciseState.setShowNoteInput}
              exerciseNote={exerciseState.exerciseNote}
              setExerciseNote={exerciseState.setExerciseNote}
              addNote={exerciseActions.addNote}
              handleExerciseComplete={exerciseActions.handleExerciseComplete}
              allSetsCompleted={allSetsCompleted}
              exerciseConcluido={exercise.concluido}
              exercise={exercise}
            />
          </>
        )}
      </Card>

      {/* Difficulty evaluation dialog */}
      <FeedbackDialog
        isOpen={exerciseState.showDifficultyDialog}
        onClose={() => exerciseState.setShowDifficultyDialog(false)}
        onSubmit={(value) => exerciseActions.handleSaveDifficultyFeedback(value as string, exerciseState.saveDifficultyFeedback)}
        title="Como foi a dificuldade?"
        description="Avalie como foi executar o exercício {exerciseName} hoje:"
        options={DIFFICULTY_OPTIONS}
        exerciseName={exercise.nome}
        muscleName={muscleName}
      />

      {/* Combined Fatigue/Pain evaluation dialog */}
      <FeedbackDialog
        isOpen={exerciseState.showCombinedFatiguePainDialog}
        onClose={() => exerciseState.setShowCombinedFatiguePainDialog(false)}
        onSubmit={(value) => exerciseState.saveCombinedFatiguePainFeedback(value as number)}
        title="Dor Muscular / Fadiga Muscular"
        description="Como você sentiu seus músculos após completar o exercício {exerciseName}?"
        options={COMBINED_FATIGUE_PAIN_OPTIONS}
        exerciseName={exercise.nome}
        muscleName={muscleName}
      />

      {/* Increment setting dialog */}
      <FeedbackDialog
        isOpen={exerciseState.showIncrementDialog}
        onClose={() => exerciseState.setShowIncrementDialog(false)}
        onSubmit={(value) => exerciseActions.handleSaveIncrementSetting(value as number, exerciseState.saveIncrementSetting)}
        title="Configuração do exercício"
        description="Qual é a carga incremental mínima para o exercício {exerciseName}?"
        options={INCREMENT_OPTIONS}
        exerciseName={exercise.nome}
        muscleName={muscleName}
      />
    </>
  );
}
