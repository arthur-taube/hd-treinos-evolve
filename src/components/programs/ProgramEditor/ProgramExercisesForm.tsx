
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
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
  mesocycles: number;
}

export default function ProgramExercisesForm({
  programName,
  programLevel,
  weeklyFrequency,
  mesocycles,
}: ProgramExercisesFormProps) {
  const navigate = useNavigate();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<string[][]>([]);
  const [currentMesocycle, setCurrentMesocycle] = useState(1);
  const [mesocycleDurations, setMesocycleDurations] = useState<number[]>(
    Array(mesocycles).fill(4)
  );

  const handleBack = () => {
    setShowExitDialog(true);
  };

  const handleNext = () => {
    if (currentMesocycle < mesocycles) {
      setCurrentMesocycle(currentMesocycle + 1);
    } else {
      // Finalizar o programa
      setShowSaveDialog(true);
    }
  };

  const handlePrevious = () => {
    if (currentMesocycle > 1) {
      setCurrentMesocycle(currentMesocycle - 1);
    }
  };

  const handleSaveSchedule = (newSchedule: string[]) => {
    setSavedSchedules([...savedSchedules, newSchedule]);
  };

  const handleSave = () => {
    // Aqui implementaremos a lógica de salvar na base de dados
    toast({
      title: "Programa salvo",
      description: "O programa foi salvo com sucesso.",
    });
  };

  const handleFinalize = () => {
    // Aqui implementaremos a lógica de finalizar e salvar na base de dados
    toast({
      title: "Programa finalizado",
      description: "O programa foi finalizado e salvo com sucesso.",
    });
    navigate("/programs");
  };

  const handleMesocycleDurationChange = (duration: number) => {
    const newDurations = [...mesocycleDurations];
    newDurations[currentMesocycle - 1] = duration;
    setMesocycleDurations(newDurations);
  };

  const copyFromPreviousMesocycle = () => {
    if (currentMesocycle > 1) {
      // Aqui implementaremos a lógica para copiar exercícios do mesociclo anterior
      toast({
        title: "Cópia realizada",
        description: `Exercícios copiados do Mesociclo ${currentMesocycle - 1}`,
      });
    }
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
          <div>
            <span className="text-muted-foreground">Mesociclos:</span> {mesocycles}
          </div>
        </div>
      </div>

      <WeeklyScheduleForm 
        weeklyFrequency={weeklyFrequency} 
        onSaveSchedule={handleSaveSchedule}
      />
      
      {currentMesocycle > 1 && (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={copyFromPreviousMesocycle}
            className="text-sm"
          >
            Copiar do Mesociclo {currentMesocycle - 1}
          </Button>
        </div>
      )}
      
      <ExerciseKanban 
        weeklyFrequency={weeklyFrequency} 
        daysSchedule={savedSchedules}
        currentMesocycle={currentMesocycle}
        totalMesocycles={mesocycles}
        mesocycleDuration={mesocycleDurations[currentMesocycle - 1]}
        onDurationChange={handleMesocycleDurationChange}
      />

      <div className="flex justify-between pt-6">
        <div>
          <Button type="button" variant="outline" onClick={handleBack} className="mr-2">
            Voltar
          </Button>
          {currentMesocycle > 1 && (
            <Button type="button" variant="outline" onClick={handlePrevious}>
              Mesociclo Anterior
            </Button>
          )}
        </div>
        
        <div>
          <Button type="button" variant="outline" onClick={handleSave} className="mr-2">
            Salvar
          </Button>
          <Button type="button" onClick={handleNext}>
            {currentMesocycle < mesocycles ? "Próximo Mesociclo" : "Finalizar"}
          </Button>
        </div>
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

      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar programa</AlertDialogTitle>
            <AlertDialogDescription>
              O programa será salvo e você será redirecionado para a página de programas. 
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
