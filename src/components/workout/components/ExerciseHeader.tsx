
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Youtube, MoreHorizontal, Check, Play, TrendingUp } from "lucide-react";
import { roundSetsForDisplay } from "@/utils/progressionCalculator";
import { useProgressionIndicator } from "@/hooks/useProgressionIndicator";

interface ExerciseHeaderProps {
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
    reps_programadas?: number | null;
    substituto_nome?: string | null;
    exercicio_original_id?: string | null;
  };
  observation: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setShowObservationInput: (show: boolean) => void;
  setShowIncrementDialog: (show: boolean) => void;
  skipIncompleteSets: () => void;
  onSubstitutionRequest: (type: 'replace-all' | 'replace-this') => void;
}

export function ExerciseHeader({
  exercise,
  observation,
  isOpen,
  setIsOpen,
  setShowObservationInput,
  setShowIncrementDialog,
  skipIncompleteSets,
  onSubstitutionRequest
}: ExerciseHeaderProps) {
  const progressionMessage = useProgressionIndicator(exercise.id, exercise.exercicio_original_id || '');
  // Função para formatar a exibição das séries/reps/peso
  const formatExerciseDisplay = () => {
    // Arredondar séries para exibição (valores decimais arredondados)
    const displaySeries = roundSetsForDisplay(exercise.series);
    const peso = exercise.peso ? `${exercise.peso}kg` : '';
    
    // Se temos reps_programadas, usar esse valor ao invés da faixa
    let repsDisplay;
    if (exercise.reps_programadas) {
      repsDisplay = exercise.reps_programadas.toString();
    } else if (exercise.repeticoes) {
      repsDisplay = exercise.repeticoes;
    } else {
      repsDisplay = "10-12";
    }
    
    // Montar o texto final
    let displayText = `${displaySeries} x ${repsDisplay}`;
    if (peso) {
      displayText += ` @ ${peso}`;
    }
    
    return displayText;
  };

  // Verificar se há progressão aplicada (peso > 0 indica que foi calculado)
  const hasProgression = exercise.peso && exercise.peso > 0;

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
              <DropdownMenuItem onClick={() => setShowIncrementDialog(true)}>
                Redefinir incremento mínimo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={skipIncompleteSets}>
                Pular séries não concluídas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSubstitutionRequest('replace-this')}>
                Substituir exercício neste treino
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSubstitutionRequest('replace-all')}>
                Mudar exercício em todos os treinos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            {exercise.substituto_nome || exercise.nome}
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatExerciseDisplay()}
          </p>
          
          {/* Indicador de progressão */}
          {progressionMessage && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600 font-medium">
                {progressionMessage}
              </span>
            </div>
          )}
          
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
