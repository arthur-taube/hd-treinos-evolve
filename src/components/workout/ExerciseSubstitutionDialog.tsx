import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { customExerciseNameSchema } from "@/lib/validation";

interface Exercise {
  id: string;
  nome: string;
  is_custom: boolean;
  user_id?: string;
}

interface RepsRange {
  id: string;
  min_reps: number;
  max_reps: number;
  tipo: string;
}

interface ExerciseSubstitutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentExercise: {
    id: string;
    nome: string;
    grupo_muscular: string;
    series: number;
    repeticoes: string | null;
    exercicio_original_id: string;
    treino_usuario_id: string;
  };
  type: 'replace-all' | 'replace-this';
  onConfirm: (data: {
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    series: number;
    reps: string;
    isCustom: boolean;
  }) => void;
}

export function ExerciseSubstitutionDialog({
  isOpen,
  onClose,
  currentExercise,
  type,
  onConfirm
}: ExerciseSubstitutionDialogProps) {
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [repsRanges, setRepsRanges] = useState<RepsRange[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>(currentExercise.grupo_muscular);
  const [selectedSeries, setSelectedSeries] = useState<string>(String(currentExercise.series));
  const [selectedReps, setSelectedReps] = useState<string>(currentExercise.repeticoes || "");
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableMuscleGroups, setAvailableMuscleGroups] = useState<string[]>([]);
  const [allowsMultipleGroups, setAllowsMultipleGroups] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchExerciseDetails();
      fetchExercises();
      fetchRepsRanges();
    }
  }, [isOpen, selectedMuscleGroup]);

  const fetchExerciseDetails = async () => {
    try {
      // Get treino details first
      const { data: treinoData, error: treinoError } = await supabase
        .from('treinos_usuario')
        .select('treino_original_id')
        .eq('id', currentExercise.treino_usuario_id)
        .single();

      if (treinoError) throw treinoError;

      // Get original exercise details from exercicios_treino
      const { data: exercicioTreino, error: exercicioError } = await supabase
        .from('exercicios_treino')
        .select('available_groups, allow_multiple_groups')
        .eq('treino_id', treinoData.treino_original_id)
        .eq('exercicio_original_id', currentExercise.exercicio_original_id)
        .single();

      if (exercicioError) {
        console.error("Error fetching exercise details:", exercicioError);
        return;
      }

      if (exercicioTreino) {
        setAllowsMultipleGroups(exercicioTreino.allow_multiple_groups || false);
        setAvailableMuscleGroups(exercicioTreino.available_groups || [currentExercise.grupo_muscular]);
      }
    } catch (error) {
      console.error("Error fetching exercise details:", error);
    }
  };

  const fetchExercises = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_available_exercises', {
        p_muscle_group: selectedMuscleGroup
      });

      if (error) throw error;
      setAvailableExercises(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar exercícios",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRepsRanges = async () => {
    try {
      const { data, error } = await supabase
        .from('faixas_repeticoes')
        .select('*')
        .order('min_reps');

      if (error) throw error;
      setRepsRanges(data || []);
    } catch (error: any) {
      console.error("Error fetching reps ranges:", error);
    }
  };

  const getMuscleGroups = async () => {
    try {
      const { data, error } = await supabase.rpc('get_distinct_muscle_groups');
      if (error) throw error;
      return data?.map(item => item.grupo_muscular) || [];
    } catch (error) {
      console.error("Error fetching muscle groups:", error);
      return [];
    }
  };

  const handleMuscleGroupChange = (newMuscleGroup: string) => {
    setSelectedMuscleGroup(newMuscleGroup);
    setSelectedExercise("");
    setIsCreatingCustom(false);
  };

  const handleCreateCustomExercise = async () => {
    // Validate exercise name
    const validation = customExerciseNameSchema.safeParse(customExerciseName);
    if (!validation.success) {
      toast({
        title: "Nome inválido",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('exercicios_custom')
        .insert({
          nome: validation.data,
          grupo_muscular: selectedMuscleGroup,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Exercício criado!",
        description: `${customExerciseName} foi adicionado aos seus exercícios.`
      });

      // Refresh exercise list and select the new one
      await fetchExercises();
      setSelectedExercise(data.id);
      setIsCreatingCustom(false);
      setCustomExerciseName("");
    } catch (error: any) {
      toast({
        title: "Erro ao criar exercício",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCustomExerciseInline = async (): Promise<string | null> => {
    // Validate exercise name
    const validation = customExerciseNameSchema.safeParse(customExerciseName);
    if (!validation.success) {
      toast({
        title: "Nome inválido",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return null;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('exercicios_custom')
        .insert({
          nome: validation.data,
          grupo_muscular: selectedMuscleGroup,
          user_id: user.user?.id
        })
        .select()
        .single();

      if (error) {
        // Se erro for de duplicata (23505), buscar o exercício existente
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('exercicios_custom')
            .select('id')
            .eq('nome', customExerciseName.trim())
            .eq('grupo_muscular', selectedMuscleGroup)
            .eq('user_id', user.user?.id)
            .maybeSingle();
          
          if (existing) {
            console.log('Exercício custom já existe, usando ID existente:', existing.id);
            return existing.id;
          }
        }
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Erro ao criar exercício custom:', error);
      return null;
    }
  };

  const handleConfirm = async () => {
    let exerciseId = selectedExercise;
    let exerciseName = "";
    let isCustom = false;

    // Se está criando custom, criar ANTES de confirmar
    if (isCreatingCustom && customExerciseName.trim()) {
      if (!selectedExercise || selectedExercise === "create-new") {
        // Criar o exercício custom primeiro
        const customId = await handleCreateCustomExerciseInline();
        if (!customId) {
          toast({
            title: "Erro ao criar exercício",
            description: "Não foi possível criar o exercício personalizado.",
            variant: "destructive"
          });
          return;
        }
        exerciseId = customId;
      }
      exerciseName = customExerciseName.trim();
      isCustom = true;
    } else if (selectedExercise && selectedExercise !== "create-new") {
      const exercise = availableExercises.find(ex => ex.id === selectedExercise);
      if (exercise) {
        exerciseId = exercise.id;
        exerciseName = exercise.nome;
        isCustom = exercise.is_custom;
      }
    }

    if (!exerciseName || !exerciseId) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione um exercício ou crie um novo.",
        variant: "destructive"
      });
      return;
    }

    onConfirm({
      exerciseId,
      exerciseName,
      muscleGroup: selectedMuscleGroup,
      series: Number(selectedSeries),
      reps: selectedReps,
      isCustom
    });

    onClose();
  };

  const formatRepsRange = (range: RepsRange) => {
    if (range.min_reps === range.max_reps) {
      return String(range.min_reps);
    }
    return `${range.min_reps}-${range.max_reps}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background z-50">
        <DialogHeader>
          <DialogTitle>
            {type === 'replace-all' 
              ? 'Mudar exercício em todos os treinos' 
              : 'Substituir exercício neste treino'
            }
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Exercise Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Exercício atual:</p>
            <p className="font-medium">{currentExercise.nome}</p>
            <Badge variant="secondary" className="mt-1">
              {currentExercise.grupo_muscular}
            </Badge>
          </div>

          {/* Muscle Group Selection (only for replace-all) */}
          {type === 'replace-all' && allowsMultipleGroups && (
            <div>
              <Label>Grupo muscular</Label>
              <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-800">
                Múltiplos grupos permitidos
              </Badge>
              <Select value={selectedMuscleGroup} onValueChange={handleMuscleGroupChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                 <SelectContent className="bg-background z-50">
                   {availableMuscleGroups.map((group) => (
                     <SelectItem key={group} value={group}>
                       {group}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
          )}

          {/* Exercise Selection */}
          <div>
            <Label>Exercício</Label>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione um exercício" />
              </SelectTrigger>
               <SelectContent className="bg-background z-50">
                 <ScrollArea className="h-[200px]">
                  {isLoading ? (
                    <SelectItem disabled value="loading">Carregando exercícios...</SelectItem>
                  ) : availableExercises.length > 0 ? (
                    <>
                      {availableExercises.map((exercise) => (
                        <SelectItem key={exercise.id} value={exercise.id}>
                          {exercise.nome}
                          {exercise.is_custom && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Personalizado
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                      <SelectItem value="create-new" className="font-medium text-primary">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Criar novo exercício
                      </SelectItem>
                    </>
                  ) : (
                    <SelectItem disabled value="empty">
                      Nenhum exercício encontrado
                    </SelectItem>
                  )}
                </ScrollArea>
              </SelectContent>
            </Select>

            {/* Custom Exercise Creation */}
            {(selectedExercise === "create-new" || isCreatingCustom) && (
              <div className="mt-3 p-3 border rounded-lg bg-muted/50">
                <Label>Nome do novo exercício</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={customExerciseName}
                    onChange={(e) => setCustomExerciseName(e.target.value)}
                    placeholder="Digite o nome do exercício"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCustomExercise();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleCreateCustomExercise}
                    disabled={isSaving || !customExerciseName.trim()}
                    size="sm"
                  >
                    {isSaving ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Series and Reps (only for replace-all) */}
          {type === 'replace-all' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Séries</Label>
                <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                   <SelectContent className="bg-background z-50">
                     {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={String(num)}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Repetições</Label>
                <Select value={selectedReps} onValueChange={setSelectedReps}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                   <SelectContent className="bg-background z-50">
                     {repsRanges.map((range) => {
                      const displayValue = formatRepsRange(range);
                      const storeValue = range.min_reps === range.max_reps 
                        ? String(range.min_reps) 
                        : `${range.min_reps}-${range.max_reps}`;
                      
                      return (
                        <SelectItem key={range.id} value={storeValue}>
                          {displayValue}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            {type === 'replace-all' ? 'Mudar em todos' : 'Substituir neste treino'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}