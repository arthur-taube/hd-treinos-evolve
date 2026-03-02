import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FeedbackDialog } from "./FeedbackDialog";
import { ExerciseSubstitutionDialog } from "./ExerciseSubstitutionDialog";
import { DIFFICULTY_OPTIONS, COMBINED_FATIGUE_OPTIONS } from "@/hooks/use-exercise-feedback";
import { useExerciseState } from "./hooks/useExerciseState";
import { useExerciseActions } from "./hooks/useExerciseActions";
import { usePreviousSeries } from "./hooks/usePreviousSeries";
import { ExerciseHeader } from "./components/ExerciseHeader";
import { ExerciseObservation } from "./components/ExerciseObservation";
import { ExerciseSets } from "./components/ExerciseSets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ExerciseCardProps {
  exercise: {
    id: string;
    nome: string;
    grupo_muscular: string;
    primary_muscle: string;
    secondary_muscle?: string;
    exercicio_original_id: string;
    card_original_id?: string | null;
    series: number;
    repeticoes: string | null;
    peso: number | null;
    concluido: boolean;
    observacao?: string | null;
    video_url?: string | null;
    configuracao_inicial?: boolean;
    reps_programadas?: number | null;
    incremento_minimo?: number | null;
    treino_usuario_id: string;
    substituto_oficial_id?: string | null;
    substituto_custom_id?: string | null;
    substituto_nome?: string | null;
  };
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>;
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>;
}

export function ExerciseCard({
  exercise,
  onExerciseComplete,
  onWeightUpdate
}: ExerciseCardProps) {
  console.log(`=== RENDERING ExerciseCard for ${exercise.nome} ===`);
  console.log(`Exercise data:`, exercise);

  const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false);
  const [substitutionType, setSubstitutionType] = useState<'replace-all' | 'replace-this'>('replace-this');

  const {
    isOpen,
    setIsOpen,
    observation,
    setObservation,
    showObservationInput,
    setShowObservationInput,
    showNoteInput,
    setShowNoteInput,
    exerciseNote,
    setExerciseNote,
    sets,
    setSets,
    originalSetCount,
    addSet,
    removeSet,
    showDifficultyDialog,
    setShowDifficultyDialog,
    showFatigueDialog,
    setShowFatigueDialog,
    showIncrementDialog,
    setShowIncrementDialog,
    saveDifficultyFeedback,
    saveFatigueFeedback,
    saveIncrementSetting,
    resetIncrementDialogShown,
    checkIsFirstWeek
  } = useExerciseState(exercise, onExerciseComplete, onWeightUpdate);

  const { isLoadingSeries, previousSeries } = usePreviousSeries(isOpen, exercise.exercicio_original_id, exercise.card_original_id);

  const {
    handleSetComplete,
    handleWeightChange,
    handleRepsChange,
    handleWeightFocus,
    handleExerciseComplete,
    handleSaveDifficultyFeedback,
    handleSaveIncrementSetting,
    saveObservation,
    skipIncompleteSets,
    addNote
  } = useExerciseActions(
    exercise,
    sets,
    setSets,
    onExerciseComplete,
    onWeightUpdate,
    setIsOpen,
    setShowDifficultyDialog,
    checkIsFirstWeek,
    originalSetCount
  );

  const allSetsCompleted = sets.every(set => set.completed);

  const handleSaveObservation = () => {
    saveObservation(observation, setShowObservationInput);
  };

  const handleAddNote = (noteText: string) => {
    addNote(noteText, setShowNoteInput);
  };

  const handleSaveDifficulty = (value: string) => {
    handleSaveDifficultyFeedback(value, saveDifficultyFeedback);
  };

  const handleSaveIncrement = (value: number) => {
    handleSaveIncrementSetting(value, saveIncrementSetting);
  };

  // Local handlers for substitution
  const handleOpenSubstitution = (type: 'replace-all' | 'replace-this') => {
    setSubstitutionType(type);
    setShowSubstitutionDialog(true);
  };

  const handleSubstitutionConfirm = async (data: {
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    series: number;
    reps: string;
    isCustom: boolean;
  }) => {
    try {
      if (substitutionType === 'replace-this') {
        // Apply temporary substitution - ID já vem criado do diálogo
        await supabase.rpc('apply_temporary_substitution', {
          p_exercise_id: exercise.id,
          p_substitute_exercise_id: data.exerciseId,
          p_substitute_name: data.exerciseName,
          p_is_custom_substitute: data.isCustom
        });

        toast({
          title: "Exercício substituído",
          description: `${data.exerciseName} substituirá ${exercise.nome} apenas neste treino.`
        });
      } else {
        // Replace in all future workouts - ID já vem criado do diálogo
        await supabase.rpc('replace_exercise_future_instances', {
          p_current_exercise_id: exercise.id,
          p_new_exercise_id: data.exerciseId,
          p_new_exercise_name: data.exerciseName,
          p_new_series: data.series,
          p_new_reps: data.reps,
          p_new_muscle_group: data.muscleGroup,
          p_is_custom_exercise: data.isCustom
        });

        toast({
          title: "Exercício alterado",
          description: `${data.exerciseName} substituirá ${exercise.nome} em todos os treinos futuros.`
        });
      }

      // Refresh the page to show changes
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro na substituição",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card className="mb-4 overflow-hidden">
        <ExerciseHeader
          exercise={exercise}
          observation={observation}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          setShowObservationInput={setShowObservationInput}
          setShowIncrementDialog={setShowIncrementDialog}
          skipIncompleteSets={skipIncompleteSets}
          onSubstitutionRequest={handleOpenSubstitution}
        />

        <ExerciseObservation
          observation={observation}
          setObservation={setObservation}
          showObservationInput={showObservationInput}
          setShowObservationInput={setShowObservationInput}
          saveObservation={handleSaveObservation}
        />

        <Accordion type="single" collapsible value={isOpen ? "sets" : ""} className="border-t">
          <AccordionItem value="sets" className="border-b-0">
            <AccordionTrigger className="hidden">Séries</AccordionTrigger>
            <AccordionContent>
              <ExerciseSets
                sets={sets}
                previousSeries={previousSeries}
                isLoadingSeries={isLoadingSeries}
                handleSetComplete={handleSetComplete}
                handleWeightChange={handleWeightChange}
                handleRepsChange={handleRepsChange}
                handleWeightFocus={handleWeightFocus}
                showNoteInput={showNoteInput}
                setShowNoteInput={setShowNoteInput}
                exerciseNote={exerciseNote}
                setExerciseNote={setExerciseNote}
                addNote={handleAddNote}
                handleExerciseComplete={handleExerciseComplete}
                allSetsCompleted={allSetsCompleted}
                exerciseConcluido={exercise.concluido}
                exercise={exercise}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                originalSetCount={originalSetCount}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <FeedbackDialog 
        isOpen={showDifficultyDialog} 
        onClose={() => setShowDifficultyDialog(false)} 
        onSubmit={handleSaveDifficulty} 
        title="Como foi o exercício?" 
        description="Avalie a dificuldade do exercício {exerciseName}" 
        options={DIFFICULTY_OPTIONS} 
        exerciseName={exercise.nome}
        required={true}
      />

      <FeedbackDialog 
        isOpen={showFatigueDialog} 
        onClose={() => setShowFatigueDialog(false)} 
        onSubmit={saveFatigueFeedback} 
        title="Dor Muscular / Fadiga Muscular" 
        description="Como você sentiu seus músculos após completar o exercício {exerciseName}?" 
        options={COMBINED_FATIGUE_OPTIONS} 
        exerciseName={exercise.nome}
        required={true}
      />

      <FeedbackDialog 
        isOpen={showIncrementDialog} 
        onClose={() => setShowIncrementDialog(false)} 
        onSubmit={handleSaveIncrement} 
        title="Defina a carga incremental mínima" 
        description="Antes de começar, informe qual o incremento mínimo de peso que você consegue adicionar no equipamento usado para o exercício {exerciseName}." 
        options={[]} 
        exerciseName={exercise.nome} 
        isNumericInput={true} 
        minValue={0.5} 
        maxValue={10} 
        step={0.5}
        required={true}
        onCancel={() => {
          setShowIncrementDialog(false);
          setIsOpen(false);
          resetIncrementDialogShown();
        }}
      />

      <ExerciseSubstitutionDialog
        isOpen={showSubstitutionDialog}
        onClose={() => setShowSubstitutionDialog(false)}
        currentExercise={{
          id: exercise.id,
          nome: exercise.nome,
          grupo_muscular: exercise.grupo_muscular,
          series: exercise.series,
          repeticoes: exercise.repeticoes,
          exercicio_original_id: exercise.exercicio_original_id,
          treino_usuario_id: exercise.treino_usuario_id
        }}
        type={substitutionType}
        onConfirm={handleSubstitutionConfirm}
      />
    </>
  );
}
