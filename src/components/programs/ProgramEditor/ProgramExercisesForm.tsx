
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

import WeeklyScheduleForm from "./WeeklyScheduleForm";
import ExerciseKanban from "./ExerciseKanban";

interface ProgramExercisesFormProps {
  programName: string;
  programLevel: string;
  weeklyFrequency: number;
}

export default function ProgramExercisesForm({
  programName,
  programLevel,
  weeklyFrequency,
}: ProgramExercisesFormProps) {
  const navigate = useNavigate();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<string[][]>([]);

  const handleBack = () => {
    setShowExitDialog(true);
  };

  const handleSaveSchedule = (newSchedule: string[]) => {
    setSavedSchedules([...savedSchedules, newSchedule]);
  };

  return (
    <div className="space-y-8">
      <div className="bg-muted/30 p-4 rounded-lg">
        <h2 className="font-medium">Detalhes do programa</h2>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Nome:</span> {programName}
          </div>
          <div>
            <span className="text-muted-foreground">Nível:</span> {programLevel}
          </div>
          <div>
            <span className="text-muted-foreground">Frequência:</span> {weeklyFrequency} vezes por semana
          </div>
        </div>
      </div>

      <WeeklyScheduleForm weeklyFrequency={weeklyFrequency} />
      
      <ExerciseKanban 
        weeklyFrequency={weeklyFrequency} 
        daysSchedule={savedSchedules} 
      />

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={handleBack}>
          Voltar
        </Button>
        <Button type="button">
          Salvar Programa
        </Button>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Se sair agora, todas as alterações serão perdidas. Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowExitDialog(false);
                navigate("/programs");
              }}
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
