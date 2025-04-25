
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { Exercise } from "./types";

interface ProgramExercisesFormProps {
  programName: string;
  programLevel: string;
  weeklyFrequency: number;
  mesocycles: number;
  programData: {
    duration: string;
    goals: string[];
    split: string;
  };
}

export default function ProgramExercisesForm({
  programName,
  programLevel,
  weeklyFrequency,
  mesocycles,
  programData,
}: ProgramExercisesFormProps) {
  const navigate = useNavigate();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<string[][]>([]);
  const [currentMesocycle, setCurrentMesocycle] = useState(1);
  const [mesocycleDurations, setMesocycleDurations] = useState<number[]>(
    Array(mesocycles).fill(4)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [exercisesPerDay, setExercisesPerDay] = useState<Record<string, Record<string, Exercise[]>>>({});

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

  const handleExercisesUpdate = (dayId: string, exercises: Exercise[], mesocycleNumber: number) => {
    setExercisesPerDay(prevState => {
      const mesocycleKey = `mesocycle-${mesocycleNumber}`;
      
      return {
        ...prevState,
        [mesocycleKey]: {
          ...(prevState[mesocycleKey] || {}),
          [dayId]: exercises,
        }
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Obtém o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não encontrado, faça login novamente");
      }

      // 1. Criar o programa
      const { data: programa, error: programaError } = await supabase
        .from('programas')
        .insert({
          nome: programName,
          descricao: `Programa de treino ${programLevel}`,
          nivel: programLevel,
          objetivo: programData.goals,
          frequencia_semanal: weeklyFrequency,
          duracao_semanas: mesocycleDurations.reduce((acc, curr) => acc + curr, 0),
          split: programData.split,
          criado_por: user.id
        })
        .select()
        .single();

      if (programaError || !programa) {
        throw new Error(`Erro ao criar programa: ${programaError?.message}`);
      }

      // 2. Criar os mesociclos
      for (let i = 0; i < mesocycles; i++) {
        const mesocicloNumero = i + 1;
        const { data: mesociclo, error: mesocicloError } = await supabase
          .from('mesociclos')
          .insert({
            programa_id: programa.id,
            numero: mesocicloNumero,
            duracao_semanas: mesocycleDurations[i]
          })
          .select()
          .single();

        if (mesocicloError || !mesociclo) {
          throw new Error(`Erro ao criar mesociclo ${mesocicloNumero}: ${mesocicloError?.message}`);
        }

        // Verifica se há exercícios para este mesociclo
        const mesocicloKey = `mesocycle-${mesocicloNumero}`;
        const mesocicloExercises = exercisesPerDay[mesocicloKey] || {};
        
        // Criar treinos para cada dia do cronograma
        if (savedSchedules.length > 0) {
          const schedule = savedSchedules[0]; // Usar o primeiro cronograma salvo
          
          for (let semana = 1; semana <= mesocycleDurations[i]; semana++) {
            for (let diaIdx = 0; diaIdx < schedule.length; diaIdx++) {
              const diaSemana = schedule[diaIdx];
              const nomeTreino = `Dia ${diaIdx + 1}`;
              
              // 3. Criar o treino
              const { data: treino, error: treinoError } = await supabase
                .from('treinos')
                .insert({
                  programa_id: programa.id,
                  mesociclo_id: mesociclo.id,
                  nome: nomeTreino,
                  dia_semana: diaSemana,
                  ordem_semana: semana
                })
                .select()
                .single();

              if (treinoError || !treino) {
                throw new Error(`Erro ao criar treino ${nomeTreino}: ${treinoError?.message}`);
              }

              // 4. Inserir exercícios do treino
              const exerciciosDia = mesocicloExercises[diaSemana] || [];
              if (exerciciosDia.length > 0) {
                const exerciciosToInsert = exerciciosDia.map((ex, index) => ({
                  treino_id: treino.id,
                  nome: ex.name,
                  grupo_muscular: ex.muscleGroup,
                  series: ex.sets,
                  repeticoes: ex.reps ? String(ex.reps) : null,
                  oculto: ex.hidden || false,
                  ordem: index + 1
                }));

                const { error: exerciciosError } = await supabase
                  .from('exercicios_treino')
                  .insert(exerciciosToInsert);

                if (exerciciosError) {
                  throw new Error(`Erro ao inserir exercícios: ${exerciciosError.message}`);
                }
              }
            }
          }
        }
      }

      toast({
        title: "Programa salvo com sucesso!",
        description: "O programa foi salvo e agora está disponível para os usuários.",
      });
      
      navigate("/programs");
    } catch (error: any) {
      toast({
        title: "Erro ao salvar o programa",
        description: error.message || "Ocorreu um erro ao salvar o programa.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = () => {
    handleSave();
  };

  const handleMesocycleDurationChange = (duration: number) => {
    const newDurations = [...mesocycleDurations];
    newDurations[currentMesocycle - 1] = duration;
    setMesocycleDurations(newDurations);
  };

  const copyFromPreviousMesocycle = () => {
    if (currentMesocycle > 1) {
      // Lógica para copiar exercícios do mesociclo anterior
      const prevMesocycleKey = `mesocycle-${currentMesocycle - 1}`;
      const currentMesocycleKey = `mesocycle-${currentMesocycle}`;
      
      setExercisesPerDay(prevState => ({
        ...prevState,
        [currentMesocycleKey]: { ...prevState[prevMesocycleKey] }
      }));

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
        onExercisesUpdate={(dayId, exercises) => handleExercisesUpdate(dayId, exercises, currentMesocycle)}
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
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setShowSaveDialog(true)}
            className="mr-2"
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
          <Button 
            type="button" 
            onClick={handleNext}
            disabled={isSaving}
          >
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
            <AlertDialogAction onClick={handleFinalize} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Finalizar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
