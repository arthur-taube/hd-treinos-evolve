import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExerciseHeaderAdvanced } from "./components/ExerciseHeaderAdvanced";
import { ExerciseObservation } from "./components/ExerciseObservation";
import { ExerciseSetsAdvanced } from "./components/ExerciseSetsAdvanced";
import { FeedbackDialog } from "./FeedbackDialog";
import { useExerciseStateAdvanced } from "./hooks/useExerciseStateAdvanced";
import { useExerciseActionsAdvanced } from "./hooks/useExerciseActionsAdvanced";
import { usePreviousSeriesAdvanced } from "./hooks/usePreviousSeriesAdvanced";
import { useEpleyProgression } from "@/hooks/useEpleyProgression";

export interface ExerciseAdvancedData {
  id: string;
  nome: string;
  grupo_muscular: string;
  exercicio_original_id: string | null;
  card_original_id?: string | null;
  series: number;
  repeticoes: string | null;
  peso: number | null;
  concluido: boolean;
  observacao?: string | null;
  configuracao_inicial?: boolean;
  incremento_minimo?: number | null;
  treino_usuario_id: string;
  rer?: string | null;
  metodo_especial?: string | null;
  modelo_feedback?: string | null;
  substituto_oficial_id?: string | null;
  substituto_custom_id?: string | null;
  substituto_nome?: string | null;
  oculto: boolean;
  ordem: number;
}

interface ExerciseCardAdvancedProps {
  exercise: ExerciseAdvancedData;
  resolvedRer: string;
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>;
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>;
}

export function ExerciseCardAdvanced({
  exercise,
  resolvedRer,
  onExerciseComplete,
  onWeightUpdate
}: ExerciseCardAdvancedProps) {
  const {
    isOpen, setIsOpen,
    observation, setObservation,
    showObservationInput, setShowObservationInput,
    sets, setSets,
    originalSetCount,
    addSet, removeSet,
    showIncrementDialog, setShowIncrementDialog,
    saveIncrementSetting,
    resetIncrementDialogShown
  } = useExerciseStateAdvanced(exercise, onExerciseComplete, onWeightUpdate);

  const { isLoadingSeries, previousSeries } = usePreviousSeriesAdvanced(
    isOpen,
    exercise.exercicio_original_id,
    exercise.card_original_id,
    exercise.substituto_custom_id
  );

  const {
    handleSetComplete, handleWeightChange, handleRepsChange, handleWeightFocus,
    handleNoteChange, saveSetNote,
    handleExerciseComplete, saveObservation, skipIncompleteSets
  } = useExerciseActionsAdvanced(
    exercise, sets, setSets,
    onExerciseComplete, onWeightUpdate,
    setIsOpen, originalSetCount
  );

  // Epley for suggested placeholders
  const epleyResult = useEpleyProgression(
    exercise.id,
    exercise.exercicio_original_id,
    exercise.card_original_id,
    exercise.treino_usuario_id,
    exercise.repeticoes,
    exercise.incremento_minimo || null
  );

  const suggestedWeight = epleyResult?.suggestedWeight || exercise.peso || 0;
  const suggestedReps = epleyResult?.suggestedReps || (() => {
    if (exercise.repeticoes?.includes('-')) {
      return parseInt(exercise.repeticoes.split('-')[0]) || 8;
    }
    return parseInt(exercise.repeticoes || '8') || 8;
  })();

  const allSetsCompleted = sets.every(set => set.completed);

  const handleSaveObservation = () => {
    saveObservation(observation, setShowObservationInput);
  };

  const handleSaveIncrement = async (value: number) => {
    await saveIncrementSetting(value);
  };

  // Placeholder for method change (will be implemented later)
  const handleMethodChange = () => {
    // TODO: Open method selection dialog
  };

  return (
    <>
      <Card className="mb-4 overflow-hidden">
        <ExerciseHeaderAdvanced
          exercise={exercise}
          resolvedRer={resolvedRer}
          observation={observation}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          setShowObservationInput={setShowObservationInput}
          setShowIncrementDialog={setShowIncrementDialog}
          skipIncompleteSets={skipIncompleteSets}
          onSubstitutionRequest={() => {}}
          onMethodChange={handleMethodChange}
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
              <ExerciseSetsAdvanced
                sets={sets}
                previousSeries={previousSeries}
                isLoadingSeries={isLoadingSeries}
                handleSetComplete={handleSetComplete}
                handleWeightChange={handleWeightChange}
                handleRepsChange={handleRepsChange}
                handleWeightFocus={handleWeightFocus}
                handleNoteChange={handleNoteChange}
                saveSetNote={saveSetNote}
                handleExerciseComplete={handleExerciseComplete}
                allSetsCompleted={allSetsCompleted}
                exerciseConcluido={exercise.concluido}
                suggestedWeight={suggestedWeight}
                suggestedReps={suggestedReps}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                originalSetCount={originalSetCount}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

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
    </>
  );
}
