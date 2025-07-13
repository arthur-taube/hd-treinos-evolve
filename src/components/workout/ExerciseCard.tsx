import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FeedbackDialog } from "./FeedbackDialog";
import { DIFFICULTY_OPTIONS, FATIGUE_OPTIONS, PAIN_OPTIONS, INCREMENT_OPTIONS } from "@/hooks/use-exercise-feedback";
import { useExerciseState } from "./hooks/useExerciseState";
import { useExerciseActions } from "./hooks/useExerciseActions";
import { usePreviousSeries } from "./hooks/usePreviousSeries";
import { ExerciseHeader } from "./components/ExerciseHeader";
import { ExerciseObservation } from "./components/ExerciseObservation";
import { ExerciseSets } from "./components/ExerciseSets";

interface ExerciseCardProps {
  exercise: {
    id: string;
    nome: string;
    grupo_muscular: string;
    primary_muscle: string;
    secondary_muscle?: string;
    exercicio_original_id: string;
    series: number;
    repeticoes: string | null;
    peso: number | null;
    concluido: boolean;
    observacao?: string | null;
    video_url?: string | null;
    configuracao_inicial?: boolean;
    reps_programadas?: number | null;
  };
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>;
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>;
}

export function ExerciseCard({
  exercise,
  onExerciseComplete,
  onWeightUpdate
}: ExerciseCardProps) {
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
    showDifficultyDialog,
    setShowDifficultyDialog,
    showFatigueDialog,
    setShowFatigueDialog,
    showPainDialog,
    setShowPainDialog,
    showIncrementDialog,
    setShowIncrementDialog,
    saveDifficultyFeedback,
    saveFatigueFeedback,
    savePainFeedback,
    saveIncrementSetting,
    checkIsFirstWeek
  } = useExerciseState(exercise, onExerciseComplete, onWeightUpdate);

  const { isLoadingSeries, previousSeries } = usePreviousSeries(isOpen, exercise.exercicio_original_id);

  const {
    handleSetComplete,
    handleWeightChange,
    handleRepsChange,
    handleExerciseComplete,
    handleSaveDifficultyFeedback,
    handleSaveIncrementSetting,
    saveObservation,
    skipIncompleteSets,
    replaceExerciseThisWorkout,
    replaceExerciseAllWorkouts,
    addNote
  } = useExerciseActions(
    exercise,
    sets,
    setSets,
    onExerciseComplete,
    onWeightUpdate,
    setIsOpen,
    setShowDifficultyDialog,
    checkIsFirstWeek
  );

  const allSetsCompleted = sets.every(set => set.completed);

  const handleSaveObservation = () => {
    saveObservation(observation, setShowObservationInput);
  };

  const handleAddNote = () => {
    addNote(setShowNoteInput);
  };

  const handleSaveDifficulty = (value: string) => {
    handleSaveDifficultyFeedback(value, saveDifficultyFeedback);
  };

  const handleSaveIncrement = (value: number) => {
    handleSaveIncrementSetting(value, saveIncrementSetting);
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
          replaceExerciseThisWorkout={replaceExerciseThisWorkout}
          replaceExerciseAllWorkouts={replaceExerciseAllWorkouts}
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
                showNoteInput={showNoteInput}
                setShowNoteInput={setShowNoteInput}
                exerciseNote={exerciseNote}
                setExerciseNote={setExerciseNote}
                addNote={handleAddNote}
                handleExerciseComplete={handleExerciseComplete}
                allSetsCompleted={allSetsCompleted}
                exerciseConcluido={exercise.concluido}
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
      />

      <FeedbackDialog 
        isOpen={showFatigueDialog} 
        onClose={() => setShowFatigueDialog(false)} 
        onSubmit={saveFatigueFeedback} 
        title="Fadiga Muscular" 
        description="Como você sentiu seus músculos após completar o exercício {exerciseName}?" 
        options={FATIGUE_OPTIONS} 
        exerciseName={exercise.nome} 
      />

      <FeedbackDialog 
        isOpen={showPainDialog} 
        onClose={() => setShowPainDialog(false)} 
        onSubmit={savePainFeedback} 
        title="Dor Muscular" 
        description="Em relação à dor muscular no(s) {muscleName}, quão dolorido você ficou depois do último treino?" 
        options={PAIN_OPTIONS} 
        exerciseName={exercise.nome} 
        muscleName={exercise.primary_muscle} 
      />

      <FeedbackDialog 
        isOpen={showIncrementDialog} 
        onClose={() => setShowIncrementDialog(false)} 
        onSubmit={handleSaveIncrement} 
        title="Defina a carga incremental mínima" 
        description="Antes de começar, informe qual o incremento mínimo de peso que você consegue adicionar no equipamento usado para o exercício {exerciseName}." 
        options={INCREMENT_OPTIONS} 
        exerciseName={exercise.nome} 
        isNumericInput={true} 
        minValue={0.5} 
        maxValue={10} 
        step={0.5} 
      />
    </>
  );
}
