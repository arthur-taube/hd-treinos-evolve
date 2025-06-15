import { useState, useEffect } from "react";
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
  initialExercisesPerDay?: Record<string, Record<string, Exercise[]>>;
  initialSavedSchedules?: string[][];
  initialMesocycleDurations?: number[];
  isEditing?: boolean;
  programId?: string;
}

export default function ProgramExercisesForm({
  programName,
  programLevel,
  weeklyFrequency,
  mesocycles,
  programData,
  initialExercisesPerDay = {},
  initialSavedSchedules = [],
  initialMesocycleDurations = [],
  isEditing = false,
  programId
}: ProgramExercisesFormProps) {
  const navigate = useNavigate();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scheduleOptions, setScheduleOptions] = useState<string[][]>(initialSavedSchedules);
  const [currentMesocycle, setCurrentMesocycle] = useState(1);
  const [mesocycleDurations, setMesocycleDurations] = useState<number[]>(
    initialMesocycleDurations.length > 0 ? initialMesocycleDurations : Array(mesocycles).fill(4)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [exercisesPerDay, setExercisesPerDay] = useState<Record<string, Record<string, Exercise[]>>>(initialExercisesPerDay);

  console.log('ProgramExercisesForm - Props:', {
    programName,
    weeklyFrequency,
    mesocycles,
    initialSavedSchedules,
    initialExercisesPerDay
  });

  console.log('ProgramExercisesForm - State:', {
    scheduleOptions,
    currentMesocycle,
    exercisesPerDay
  });

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

  const handleSaveSchedules = (newSchedules: string[][]) => {
    console.log('handleSaveSchedules - recebido:', newSchedules);
    try {
      setScheduleOptions(newSchedules);
      console.log('handleSaveSchedules - scheduleOptions atualizado para:', newSchedules);
    } catch (error) {
      console.error('Erro em handleSaveSchedules:', error);
      throw error;
    }
  };

  const handleExercisesUpdate = (dayId: string, exercises: Exercise[], mesocycleNumber: number) => {
    console.log('handleExercisesUpdate:', { dayId, exercises, mesocycleNumber });
    
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não encontrado, faça login novamente");
      }

      if (isEditing && programId) {
        // Modo de edição - atualizar programa existente
        await updateExistingProgram(programId);
      } else {
        // Modo de criação - criar novo programa
        await createNewProgram(user.id);
      }

      toast({
        title: isEditing ? "Programa atualizado com sucesso!" : "Programa salvo com sucesso!",
        description: isEditing ? "As alterações foram salvas." : "O programa foi salvo e agora está disponível para os usuários.",
      });
      
      navigate("/programs");
    } catch (error: any) {
      toast({
        title: isEditing ? "Erro ao atualizar o programa" : "Erro ao salvar o programa",
        description: error.message || "Ocorreu um erro.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const createNewProgram = async (userId: string) => {
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
        criado_por: userId
      } as any)
      .select()
      .single();

    if (programaError || !programa) {
      throw new Error(`Erro ao criar programa: ${programaError?.message}`);
    }

    await createMesocyclesAndWorkouts(programa.id);
  };

  const updateExistingProgram = async (programId: string) => {
    // 1. Atualizar dados do programa
    const { error: programaError } = await supabase
      .from('programas')
      .update({
        nome: programName,
        descricao: `Programa de treino ${programLevel}`,
        nivel: programLevel,
        objetivo: programData.goals,
        frequencia_semanal: weeklyFrequency,
        duracao_semanas: mesocycleDurations.reduce((acc, curr) => acc + curr, 0),
        split: programData.split
      })
      .eq('id', programId);

    if (programaError) {
      throw new Error(`Erro ao atualizar programa: ${programaError.message}`);
    }

    // 2. Deletar exercícios_treino existentes para recriar
    const { data: treinos } = await supabase
      .from('treinos')
      .select('id')
      .eq('programa_id', programId);

    if (treinos && treinos.length > 0) {
      const treinoIds = treinos.map(t => t.id);
      await supabase
        .from('exercicios_treino')
        .delete()
        .in('treino_id', treinoIds);
    }

    // 3. Deletar treinos e mesociclos existentes
    await supabase
      .from('treinos')
      .delete()
      .eq('programa_id', programId);

    await supabase
      .from('mesociclos')
      .delete()
      .eq('programa_id', programId);

    // 4. Recriar mesociclos e treinos com novos dados
    await createMesocyclesAndWorkouts(programId);
  };

  const createMesocyclesAndWorkouts = async (programaId: string) => {
    // 2. Criar os mesociclos com cronogramas recomendados
    for (let i = 0; i < mesocycles; i++) {
      const mesocicloNumero = i + 1;
      const { data: mesociclo, error: mesocicloError } = await supabase
        .from('mesociclos')
        .insert({
          programa_id: programaId,
          numero: mesocicloNumero,
          duracao_semanas: mesocycleDurations[i],
          cronogramas_recomendados: scheduleOptions // Salvar as opções de cronograma
        } as any)
        .select()
        .single();

      if (mesocicloError || !mesociclo) {
        throw new Error(`Erro ao criar mesociclo ${mesocicloNumero}: ${mesocicloError?.message}`);
      }

      const mesocicloKey = `mesocycle-${mesocicloNumero}`;
      const mesocicloExercises = exercisesPerDay[mesocicloKey] || {};
      
      // Criar treinos para cada dia do cronograma (usando a primeira opção como padrão)
      if (scheduleOptions.length > 0) {
        const schedule = scheduleOptions[0]; // Usar primeira opção como padrão
        
        // Para cada semana do mesociclo, criar treinos aplicando as alterações do kanban
        for (let semana = 1; semana <= mesocycleDurations[i]; semana++) {
          for (let diaIdx = 0; diaIdx < schedule.length; diaIdx++) {
            const diaSemana = schedule[diaIdx];
            const nomeTreino = `Dia ${diaIdx + 1}`;
            
            // 3. Criar o treino
            const { data: treino, error: treinoError } = await supabase
              .from('treinos')
              .insert({
                programa_id: programaId,
                mesociclo_id: mesociclo.id,
                nome: nomeTreino,
                dia_semana: diaSemana,
                ordem_semana: semana
              } as any)
              .select()
              .single();

            if (treinoError || !treino) {
              throw new Error(`Erro ao criar treino ${nomeTreino}: ${treinoError?.message}`);
            }

            // 4. Inserir exercícios do treino (aplicar exercícios do kanban para todas as semanas)
            const exerciciosDia = mesocicloExercises[diaSemana] || [];
            if (exerciciosDia.length > 0) {
              const exerciciosToInsert = await Promise.all(
                exerciciosDia.map(async (ex, index) => {
                  let exercicioOriginalId = null;
                  
                  if (ex.name && ex.name !== "Novo Exercício") {
                    const { data: exercicioOriginal } = await supabase
                      .from('exercicios_iniciantes')
                      .select('id')
                      .eq('nome', ex.name)
                      .single();
                    
                    if (exercicioOriginal) {
                      exercicioOriginalId = exercicioOriginal.id;
                    }
                  }

                  return {
                    treino_id: treino.id,
                    nome: ex.name,
                    grupo_muscular: ex.muscleGroup,
                    series: ex.sets,
                    repeticoes: ex.reps ? String(ex.reps) : null,
                    oculto: ex.hidden || false,
                    ordem: index + 1,
                    exercicio_original_id: exercicioOriginalId,
                    allow_multiple_groups: ex.allowMultipleGroups || false,
                    available_groups: ex.allowMultipleGroups ? ex.availableGroups : null
                  };
                })
              );

              const { error: exerciciosError } = await supabase
                .from('exercicios_treino')
                .insert(exerciciosToInsert as any[]);

              if (exerciciosError) {
                throw new Error(`Erro ao inserir exercícios: ${exerciciosError.message}`);
              }
            }
          }
        }
      }
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
        <h2 className="font-medium">{isEditing ? "Editando programa" : "Detalhes do programa"}</h2>
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
        onSaveSchedules={handleSaveSchedules}
        initialSchedules={scheduleOptions}
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
        daysSchedule={scheduleOptions}
        currentMesocycle={currentMesocycle}
        totalMesocycles={mesocycles}
        mesocycleDuration={mesocycleDurations[currentMesocycle - 1]}
        onDurationChange={handleMesocycleDurationChange}
        onExercisesUpdate={(dayId, exercises) => handleExercisesUpdate(dayId, exercises, currentMesocycle)}
        initialExercises={exercisesPerDay[`mesocycle-${currentMesocycle}`]}
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
            {isSaving ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}
          </Button>
          <Button 
            type="button" 
            onClick={handleNext}
            disabled={isSaving}
          >
            {currentMesocycle < mesocycles ? "Próximo Mesociclo" : isEditing ? "Finalizar Edição" : "Finalizar"}
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
