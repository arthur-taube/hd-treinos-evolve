import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Youtube, MoreHorizontal, Check, Play, TrendingUp, Zap } from "lucide-react";
import { roundSetsForDisplay } from "@/utils/progressionCalculator";
import { supabase } from "@/integrations/supabase/client";
import { type EpleyResult } from "@/hooks/useEpleyProgression";

interface ExerciseHeaderAdvancedProps {
  exercise: {
    id: string;
    nome: string;
    grupo_muscular: string;
    series: number;
    repeticoes: string | null;
    peso: number | null;
    concluido: boolean;
    observacao?: string | null;
    exercicio_original_id?: string | null;
    card_original_id?: string | null;
    substituto_nome?: string | null;
    substituto_oficial_id?: string | null;
    substituto_custom_id?: string | null;
    metodo_especial?: string | null;
    incremento_minimo?: number | null;
    treino_usuario_id: string;
  };
  resolvedRer: string;
  observation: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setShowObservationInput: (show: boolean) => void;
  setShowIncrementDialog: (show: boolean) => void;
  skipIncompleteSets: () => void;
  onSubstitutionRequest: (type: 'replace-all' | 'replace-this') => void;
  onMethodChange?: () => void;
}

export function ExerciseHeaderAdvanced({
  exercise,
  resolvedRer,
  observation,
  isOpen,
  setIsOpen,
  setShowObservationInput,
  setShowIncrementDialog,
  skipIncompleteSets,
  onSubstitutionRequest,
  onMethodChange
}: ExerciseHeaderAdvancedProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const epleyResult = useEpleyProgression(
    exercise.id,
    exercise.exercicio_original_id || null,
    exercise.card_original_id || null,
    exercise.treino_usuario_id,
    exercise.repeticoes,
    exercise.incremento_minimo || null
  );

  // Fetch video_url from exercicios_avancados
  useEffect(() => {
    const fetchVideoUrl = async () => {
      if (exercise.substituto_custom_id && !exercise.substituto_oficial_id) {
        setVideoUrl(null);
        return;
      }
      const activeId = exercise.substituto_oficial_id || exercise.exercicio_original_id;
      if (!activeId) { setVideoUrl(null); return; }
      const { data } = await supabase
        .from('exercicios_avancados')
        .select('video_url')
        .eq('id', activeId)
        .single();
      setVideoUrl(data?.video_url || null);
    };
    fetchVideoUrl();
  }, [exercise.substituto_oficial_id, exercise.substituto_custom_id, exercise.exercicio_original_id]);

  const formatExerciseDisplay = () => {
    const displaySeries = roundSetsForDisplay(exercise.series);
    const repsDisplay = exercise.repeticoes || "8-12";
    let text = `${displaySeries} x ${repsDisplay}`;
    if (resolvedRer) {
      text += ` @${resolvedRer} RER`;
    }
    return text;
  };

  const hasMethod = !!exercise.metodo_especial;

  return (
    <div className="p-4">
      <div className="flex justify-between items-start mb-2">
        <Badge variant="outline" className="bg-muted">
          {exercise.grupo_muscular}
        </Badge>

        <div className="flex items-center gap-2">
          {videoUrl && (
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-700">
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
              <DropdownMenuItem onClick={onMethodChange}>
                {hasMethod ? 'Alterar' : 'Implementar'} Método Especial
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

          {/* Special method highlight */}
          {exercise.metodo_especial && (
            <div className="flex items-center gap-1 mt-0.5">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-semibold text-amber-500">
                {exercise.metodo_especial}
              </span>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-1">
            {formatExerciseDisplay()}
          </p>

          {/* Epley progression indicator */}
          {epleyResult && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">
                {epleyResult.message}
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
