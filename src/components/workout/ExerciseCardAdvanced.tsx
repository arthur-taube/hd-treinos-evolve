import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExerciseHeaderAdvanced } from "./components/ExerciseHeaderAdvanced";
import { ExerciseObservation } from "./components/ExerciseObservation";
import { ExerciseSetsAdvanced } from "./components/ExerciseSetsAdvanced";
import { FeedbackDialog } from "./FeedbackDialog";
import { ARAFeedbackDialog } from "./ARAFeedbackDialog";
import { ExerciseSubstitutionDialog } from "./ExerciseSubstitutionDialog";
import { useExerciseStateAdvanced } from "./hooks/useExerciseStateAdvanced";
import { useExerciseActionsAdvanced } from "./hooks/useExerciseActionsAdvanced";
import { usePreviousSeriesAdvanced } from "./hooks/usePreviousSeriesAdvanced";
import { useEpleyProgression } from "@/hooks/useEpleyProgression";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const [showARADialog, setShowARADialog] = useState(false);
  const [showAMPDialog, setShowAMPDialog] = useState(false);

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
    handleExerciseComplete, saveARAFeedback, saveAMPFeedback,
    saveObservation, skipIncompleteSets
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

  const defaultMinReps = (() => {
    if (exercise.repeticoes?.includes('-')) {
      return parseInt(exercise.repeticoes.split('-')[0]) || 8;
    }
    return parseInt(exercise.repeticoes || '8') || 8;
  })();

  const suggestedWeight = epleyResult?.suggestedWeight || exercise.peso || 0;
  const suggestedReps = epleyResult?.suggestedReps || defaultMinReps;

  // Update sets with Epley suggestions when they arrive
  useEffect(() => {
    if (!epleyResult) return;
    setSets(prev => prev.map(set => {
      if (set.completed) return set;
      const isDefaultWeight = set.weight === null;
      const isDefaultReps = set.reps === null || set.reps === defaultMinReps;
      return {
        ...set,
        weight: isDefaultWeight ? epleyResult.suggestedWeight : set.weight,
        reps: isDefaultReps ? epleyResult.suggestedReps : set.reps,
      };
    }));
  }, [epleyResult]);

  const allSetsCompleted = sets.every(set => set.completed);

  const handleSaveObservation = () => {
    saveObservation(observation, setShowObservationInput);
  };

  const handleSaveIncrement = async (value: number) => {
    await saveIncrementSetting(value);
    setShowIncrementDialog(false);
  };

  const handleCompleteWithFeedback = async () => {
    const success = await handleExerciseComplete();
    if (success) {
      const feedbackModel = exercise.modelo_feedback || 'ARA/ART';
      if (feedbackModel.includes('ARA')) {
        setShowARADialog(true);
      } else if (feedbackModel.includes('AMP')) {
        setShowAMPDialog(true);
      } else {
        setIsOpen(false);
      }
    }
  };

  const handleARASubmit = async (pumpValue: number, fadigaValue: number) => {
    await saveARAFeedback(pumpValue, fadigaValue);
    setShowARADialog(false);
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
          epleyResult={epleyResult}
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
                handleExerciseComplete={handleCompleteWithFeedback}
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

      <ARAFeedbackDialog
        isOpen={showARADialog}
        exerciseName={exercise.nome}
        onSubmit={handleARASubmit}
      />

      <FeedbackDialog
        isOpen={showAMPDialog}
        onClose={() => setShowAMPDialog(false)}
        onSubmit={(value) => {
          saveAMPFeedback(Number(value));
          setShowAMPDialog(false);
        }}
        title="Avaliação de Manutenção da Performance"
        description={`Você está conseguindo manter ou aumentar a força e a performance no exercício {exerciseName}?`}
        exerciseName={exercise.nome}
        required={true}
        options={[
          {
            value: 1,
            label: "Perdi, muito fofo!",
            description: "Eu notei perda de força e performance nesse exercício, provavelmente devido a uma falta de treino, pois minha recuperação está ótima."
          },
          {
            value: 0,
            label: "Mantive/Ganhei",
            description: "Eu mantive ou aumentei minha força/performance nesse exercício."
          },
          {
            value: -1,
            label: "Perdi, estou exausto!",
            description: "Eu notei perda de força/performance nesse exercício e estou sentindo dificuldade na recuperação (treino excessivo)."
          }
        ]}
      />
    </>
  );
}
