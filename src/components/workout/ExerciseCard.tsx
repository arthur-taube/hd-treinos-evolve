import { useState } from "react";
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
interface ExerciseCardProps {
  exercise: {
    id: string;
    nome: string;
    grupo_muscular: string;
    series: number;
    repeticoes: string | null;
    peso: number | null;
    concluido: boolean;
    observacao?: string | null;
    video_url?: string | null;
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
    await onExerciseComplete(exercise.id, true);
    setIsOpen(false);
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
  return <Card className="mb-4 overflow-hidden">
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
              <div className="grid grid-cols-4 gap-2 mb-2 text-sm font-medium text-muted-foreground">
                <div>Série</div>
                <div>Carga</div>
                <div>Reps</div>
                <div></div>
              </div>
              
              {sets.map((set, index) => <div key={index} className={`grid grid-cols-4 gap-2 items-center py-2 ${index !== sets.length - 1 ? "border-b" : ""}`}>
                  <div>{set.number}</div>
                  <div className="flex items-center">
                    <Input type="number" className="w-16 h-8 text-sm" value={set.weight || ""} onChange={e => handleWeightChange(index, Number(e.target.value))} min={0} step={1} />
                    <span className="ml-1 text-sm">kg</span>
                  </div>
                  <div>
                    <Input type="number" className="w-12 h-8 text-sm" value={set.reps || ""} onChange={e => handleRepsChange(index, Number(e.target.value))} min={0} step={1} />
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
    </Card>;
}