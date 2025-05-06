
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, Youtube, MoreHorizontal, ChevronDown, Play, Edit, X } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";
import { useExerciseFeedback, DIFFICULTY_OPTIONS, FATIGUE_OPTIONS, PAIN_OPTIONS, INCREMENT_OPTIONS } from "@/hooks/use-exercise-feedback";

interface ExerciseCardProps {
  exercise: {
    id: string;
    nome: string;
    grupo_muscular: string;
    primary_muscle: string;
    exercicio_original_id: string;
    series: number;
    repeticoes: string | null;
    peso: number | null;
    concluido: boolean;
    observacao?: string | null;
    video_url?: string | null;
    configuracao_inicial?: boolean;
  };
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>;
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>;
}

interface SetData {
  number: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

interface SeriesData {
  date: string;
  weight: number;
  reps: number;
}

export function ExerciseCard({
  exercise,
  onExerciseComplete,
  onWeightUpdate
}: ExerciseCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [observation, setObservation] = useState(exercise.observacao || "");
  const [showObservationInput, setShowObservationInput] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [exerciseNote, setExerciseNote] = useState("");
  const [sets, setSets] = useState<SetData[]>(Array.from({
    length: exercise.series
  }, (_, i) => ({
    number: i + 1,
    weight: exercise.peso || null,
    reps: exercise.repeticoes ? parseInt(exercise.repeticoes) : null,
    completed: false
  })));
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [previousSeries, setPreviousSeries] = useState<SeriesData[]>([]);

  const {
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
    checkInitialConfiguration,
    checkNeedsPainEvaluation
  } = useExerciseFeedback(exercise.id);

  // Check for initial configuration when exercise card is opened
  useEffect(() => {
    if (isOpen && !exercise.configuracao_inicial) {
      checkInitialConfiguration();
    }
  }, [isOpen, exercise.configuracao_inicial]);

  // Check if pain evaluation is needed when starting the exercise
  useEffect(() => {
    if (isOpen) {
      checkNeedsPainEvaluation(exercise.primary_muscle);
    }
  }, [isOpen, exercise.primary_muscle]);

  // Carregar séries anteriores do mesmo exercício (usando exercicio_original_id)
  useEffect(() => {
    if (isOpen && exercise.exercicio_original_id) {
      fetchPreviousSeries();
    }
  }, [isOpen, exercise.exercicio_original_id]);

  const fetchPreviousSeries = async () => {
    setIsLoadingSeries(true);
    try {
      // Buscar exercícios anteriores com o mesmo exercicio_original_id
      const { data: previousExercises, error: exercisesError } = await supabase
        .from('exercicios_treino_usuario')
        .select('id, treino_usuario_id')
        .eq('exercicio_original_id', exercise.exercicio_original_id)
        .eq('concluido', true)
        .neq('id', exercise.id)  // Excluir o exercício atual
        .order('updated_at', { ascending: false })
        .limit(3);  // Pegar apenas os 3 últimos exercícios
      
      if (exercisesError) throw exercisesError;
      
      if (!previousExercises || previousExercises.length === 0) {
        setIsLoadingSeries(false);
        return;
      }
      
      // Para cada exercício anterior, buscar as séries
      const seriesPromises = previousExercises.map(async (ex) => {
        // Check if table exists before querying it
        const { error: tableExistsError } = await supabase
          .from('exercicios_treino_usuario')
          .select('id')
          .limit(1);
        
        if (tableExistsError && tableExistsError.message.includes('does not exist')) {
          console.warn("Series table does not exist yet, skipping history lookup");
          return { 
            exerciseId: ex.id, 
            trainingId: ex.treino_usuario_id,
            series: [] 
          };
        }
        
        // We'll manually use RPC to get series data instead of direct table access
        // since we might not have the series_exercicio_usuario table in types yet
        const { data, error } = await supabase.rpc('get_series_by_exercise', {
          exercise_id: ex.id
        });
          
        if (error) {
          console.error("Error fetching series:", error);
          return { 
            exerciseId: ex.id, 
            trainingId: ex.treino_usuario_id,
            series: []
          };
        }
        
        return { 
          exerciseId: ex.id, 
          trainingId: ex.treino_usuario_id,
          series: data || [] 
        };
      });
      
      const seriesResults = await Promise.all(seriesPromises);
      
      // Para cada treino, buscar a data de conclusão
      const trainingDatePromises = seriesResults.map(async (result) => {
        if (result.series.length === 0) return null;
        
        const { data, error } = await supabase
          .from('treinos_usuario')
          .select('data_concluido')
          .eq('id', result.trainingId)
          .single();
          
        if (error) return null;
        
        return {
          exerciseId: result.exerciseId,
          date: data?.data_concluido || null,
          series: result.series
        };
      });
      
      const trainingResults = await Promise.all(trainingDatePromises);
      
      // Formatar os dados para exibição
      const formattedSeries = trainingResults
        .filter(result => result !== null && result.date !== null)
        .map(result => {
          // Since we're using RPC, we need to handle the response differently
          // Let's assume the RPC returns data in the expected format
          const bestSeries = result!.series.reduce((best: any, current: any) => {
            // Considerar a melhor série como a que tem o maior produto peso x repetições
            const bestValue = best.peso * best.repeticoes;
            const currentValue = current.peso * current.repeticoes;
            return currentValue > bestValue ? current : best;
          }, result!.series[0] || { peso: 0, repeticoes: 0 });
          
          return {
            date: new Date(result!.date!).toLocaleDateString('pt-BR'),
            weight: bestSeries.peso || 0,
            reps: bestSeries.repeticoes || 0
          };
        });
      
      setPreviousSeries(formattedSeries);
    } catch (error) {
      console.error("Erro ao buscar séries anteriores:", error);
    } finally {
      setIsLoadingSeries(false);
    }
  };

  const handleSetComplete = (index: number) => {
    setSets(prevSets => {
      const newSets = [...prevSets];
      newSets[index].completed = !newSets[index].completed;
      return newSets;
    });
  };

  const handleWeightChange = (index: number, weight: number) => {
    setSets(prevSets => {
      const newSets = [...prevSets];
      newSets[index].weight = weight;

      // Atualizar o peso do exercício na base de dados
      if (index === 0) {
        onWeightUpdate(exercise.id, weight);
      }
      return newSets;
    });
  };

  const handleRepsChange = (index: number, reps: number) => {
    setSets(prevSets => {
      const newSets = [...prevSets];
      newSets[index].reps = reps;
      return newSets;
    });
  };

  const handleExerciseComplete = async () => {
    try {
      // Create the series table if it doesn't exist yet
      await supabase.rpc('ensure_series_table');
      
      // Salvar dados de todas as séries usando RPC
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        await supabase.rpc('save_series', {
          p_exercicio_id: exercise.id,
          p_numero_serie: i + 1,
          p_peso: set.weight || 0,
          p_repeticoes: set.reps || 0,
          p_concluida: set.completed
        });
      }
      
      // Marcar exercício como concluído
      await onExerciseComplete(exercise.id, true);
      setIsOpen(false);

      // Show difficulty dialog after completing the exercise
      setShowDifficultyDialog(true);
      
    } catch (error: any) {
      toast({
        title: "Erro ao salvar séries",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const saveObservation = async () => {
    try {
      const {
        error
      } = await supabase.from('exercicios_treino_usuario').update({
        observacao: observation
      }).eq('id', exercise.id);
      if (error) throw error;
      toast({
        title: "Observação salva",
        description: "A observação foi salva com sucesso."
      });
      setShowObservationInput(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar observação",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const skipIncompleteSets = async () => {
    await onExerciseComplete(exercise.id, true);
    setIsOpen(false);

    // Show difficulty dialog after completing the exercise
    setShowDifficultyDialog(true);
  };
  
  const replaceExerciseThisWorkout = async () => {
    // Implementação para substituir o exercício apenas neste treino
    toast({
      description: "Funcionalidade a ser implementada: Substituir exercício neste treino"
    });
  };
  
  const replaceExerciseAllWorkouts = async () => {
    // Implementação para substituir o exercício em todos os treinos futuros
    toast({
      description: "Funcionalidade a ser implementada: Substituir exercício em todos os treinos"
    });
  };
  
  const addNote = () => {
    // Implementação para adicionar uma nota ao exercício
    toast({
      description: "Nota adicionada ao exercício"
    });
    setShowNoteInput(false);
  };
  
  const allSetsCompleted = sets.every(set => set.completed);
  
  return <>
      <Card className="mb-4 overflow-hidden">
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <Badge variant="outline" className="bg-muted">
              {exercise.grupo_muscular}
            </Badge>
            
            <div className="flex items-center gap-2">
              {exercise.video_url && <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-700">
                  <Youtube className="h-5 w-5" />
                </a>}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowObservationInput(true)}>
                    Adicionar observações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={skipIncompleteSets}>
                    Pular séries não concluídas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={replaceExerciseThisWorkout}>
                    Substituir exercício neste treino
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={replaceExerciseAllWorkouts}>
                    Mudar exercício em todos os treinos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">{exercise.nome}</h3>
              <p className="text-sm text-muted-foreground">
                {exercise.series} x {exercise.repeticoes || "10-12"} 
                {exercise.peso ? ` @ ${exercise.peso}kg` : ""}
              </p>
              
              {observation && <div className="mt-2 p-1.5 border border-yellow-200 rounded-md text-sm bg-[#aea218]/70">
                  {observation}
                </div>}
            </div>
            
            <Button variant="ghost" size="lg" className={`rounded-full h-12 w-12 p-0 ${exercise.concluido ? "bg-green-100 text-green-600" : ""}`} onClick={() => setIsOpen(!isOpen)}>
              {exercise.concluido ? <Check className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
          </div>
          
          {showObservationInput && <div className="mt-4 space-y-2">
              <Input value={observation} onChange={e => setObservation(e.target.value)} placeholder="Digite sua observação sobre o exercício" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowObservationInput(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={saveObservation}>
                  Salvar
                </Button>
              </div>
            </div>}
        </div>

        <Accordion type="single" collapsible value={isOpen ? "sets" : ""} className="border-t">
          <AccordionItem value="sets" className="border-b-0">
            <AccordionTrigger className="hidden">Séries</AccordionTrigger>
            <AccordionContent>
              <div className="px-4 py-2">
                {/* Histórico de séries anteriores */}
                {previousSeries.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-medium mb-2">Histórico recente:</h4>
                    <div className="space-y-1">
                      {previousSeries.map((seriesData, idx) => (
                        <p key={idx} className="text-sm">
                          {seriesData.date}: <span className="font-medium">{seriesData.weight}kg</span> x {seriesData.reps} reps
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                {isLoadingSeries && (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    Carregando histórico...
                  </div>
                )}
              
                <div className="grid grid-cols-4 gap-2 mb-2 text-sm font-medium text-muted-foreground">
                  <div>Série</div>
                  <div>Carga</div>
                  <div>Reps</div>
                  <div></div>
                </div>
                
                {sets.map((set, index) => <div key={index} className={`grid grid-cols-4 gap-2 items-center py-2 ${index !== sets.length - 1 ? "border-b" : ""}`}>
                    <div>{set.number}</div>
                    <div className="flex items-center">
                      <Input type="number" value={set.weight || ""} onChange={e => handleWeightChange(index, Number(e.target.value))} min={0} step={1} className="w-20 h-8 text-sm" />
                      <span className="ml-1 text-sm">kg</span>
                    </div>
                    <div>
                      <Input type="number" value={set.reps || ""} onChange={e => handleRepsChange(index, Number(e.target.value))} min={0} step={1} className="w-20 h-8 text-sm" />
                    </div>
                    <div className="flex justify-center">
                      <Button variant={set.completed ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => handleSetComplete(index)}>
                        {set.completed ? <Check className="h-4 w-4" /> : null}
                      </Button>
                    </div>
                  </div>)}
                
                <div className="mt-4 space-y-4">
                  {showNoteInput ? <div className="space-y-2">
                      <Input placeholder="Digite sua anotação sobre este exercício" value={exerciseNote} onChange={e => setExerciseNote(e.target.value)} />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowNoteInput(false)}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={addNote}>
                          Salvar nota
                        </Button>
                      </div>
                    </div> : <Button variant="outline" className="text-sm" onClick={() => setShowNoteInput(true)}>
                      Adicionar nota
                    </Button>}
                  
                  <Button className="w-full" disabled={exercise.concluido} onClick={handleExerciseComplete}>
                    {allSetsCompleted ? "Todas séries concluídas" : "Concluir exercício"}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <FeedbackDialog 
        isOpen={showDifficultyDialog} 
        onClose={() => setShowDifficultyDialog(false)} 
        onSubmit={saveDifficultyFeedback} 
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
        onSubmit={saveIncrementSetting} 
        title="Defina a carga incremental mínima" 
        description="Antes de começar, informe qual o incremento mínimo de peso que você consegue adicionar no equipamento usado para o exercício {exerciseName}." 
        options={INCREMENT_OPTIONS} 
        exerciseName={exercise.nome} 
        isNumericInput={true} 
        minValue={0.5} 
        maxValue={10} 
        step={0.5} 
      />
    </>;
}
