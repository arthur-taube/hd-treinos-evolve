
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Youtube, MoreHorizontal, Check, Play } from "lucide-react";

interface ExerciseHeaderProps {
  exercise: {
    nome: string;
    grupo_muscular: string;
    series: number;
    repeticoes: string | null;
    peso: number | null;
    concluido: boolean;
    observacao?: string | null;
    video_url?: string | null;
    reps_programadas?: number | null;
  };
  observation: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setShowObservationInput: (show: boolean) => void;
  skipIncompleteSets: () => void;
  replaceExerciseThisWorkout: () => void;
  replaceExerciseAllWorkouts: () => void;
}

export function ExerciseHeader({
  exercise,
  observation,
  isOpen,
  setIsOpen,
  setShowObservationInput,
  skipIncompleteSets,
  replaceExerciseThisWorkout,
  replaceExerciseAllWorkouts
}: ExerciseHeaderProps) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-start mb-2">
        <Badge variant="outline" className="bg-muted">
          {exercise.grupo_muscular}
        </Badge>
        
        <div className="flex items-center gap-2">
          {exercise.video_url && (
            <a 
              href={exercise.video_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-red-500 hover:text-red-700"
            >
              <Youtube className="h-5 w-5" />
            </a>
          )}
          
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
            {exercise.reps_programadas && (
              <span className="text-blue-600 font-medium"> (Target: {exercise.reps_programadas} reps)</span>
            )}
          </p>
          
          {observation && (
            <div className="mt-2 p-1.5 border border-yellow-200 rounded-md text-sm bg-[#aea218]/70">
              {observation}
            </div>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="lg" 
          className={`rounded-full h-12 w-12 p-0 ${exercise.concluido ? "bg-green-100 text-green-600" : ""}`} 
          onClick={() => setIsOpen(!isOpen)}
        >
          {exercise.concluido ? <Check className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  );
}
