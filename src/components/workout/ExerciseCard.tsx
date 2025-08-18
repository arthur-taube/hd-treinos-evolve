
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseHeader } from "./components/ExerciseHeader";
import { ExerciseObservation } from "./components/ExerciseObservation";
import { ExerciseSets } from "./components/ExerciseSets";
import { FeedbackDialog } from "./FeedbackDialog";
import { IncrementConfigDialog } from "./IncrementConfigDialog";
import { useExerciseState } from "./hooks/useExerciseState";
import { useExerciseActions } from "./hooks/useExerciseActions";
import { usePreviousSeries } from "./hooks/usePreviousSeries";
import { 
  DIFFICULTY_OPTIONS, 
  COMBINED_FATIGUE_PAIN_OPTIONS
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
  const { previousSeries, isLoadingSeries } = usePreviousSeries(exerciseState.isOpen, exercise.exercicio_original_id);

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

  const handleExerciseExpand = async (isOpen: boolean) => {
    exerciseState.setIsOpen(isOpen);
    
    if (isOpen && !exercise.concluido && exerciseState.checkNeedsIncrementConfiguration()) {
      try {
        const { data, error } = await supabase
          .from('exercicios_treino_usuario')
          .select('configuracao_inicial, incremento_minimo')
          .eq('id', exercise.id)
          .single();
        
        if (error) throw error;
        
        if (data && !data.configuracao_inicial && (!data.incremento_minimo || data.incremento_minimo <= 0)) {
          exerciseState.setShowIncrementDialog(true);
        }
      } catch (error: any) {
        console.error("Erro ao verificar configuração inicial:", error);
      }
    }
  };

  return (
    <>
      <Card className="mb-4">
        <ExerciseHeader 
          exercise={exercise}
          isOpen={exerciseState.isOpen}
          setIsOpen={handleExerciseExpand}
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
              saveObservation={() => exerciseActions.saveObservation(exerciseState.observation, exerciseState.setShowObservationInput)}
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
              addNote={() => exerciseActions.addNote(exerciseState.setShowNoteInput)}
              handleExerciseComplete={exerciseActions.handleExerciseComplete}
              allSetsCompleted={allSetsCompleted}
              exerciseConcluido={exercise.concluido}
              exercise={{
                peso: exercise.peso,
                reps_programadas: exercise.reps_programadas,
                repeticoes: exercise.repeticoes || undefined
              }}
            />
          </>
        )}
      </Card>

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

      <IncrementConfigDialog
        isOpen={exerciseState.showIncrementDialog}
        onClose={() => exerciseState.setShowIncrementDialog(false)}
        onSubmit={(value) => exerciseActions.handleSaveIncrementSetting(value, exerciseState.saveIncrementSetting)}
        exerciseName={exercise.nome}
        muscleName={muscleName}
      />
    </>
  );
}
