import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckCircle, XCircle, Trophy, MoreVertical, SkipForward, RotateCcw } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { precomputeNextExerciseProgression } from "@/utils/nextWorkoutProgression";

interface ProgramaUsuario {
  id: string;
  programa_original_id: string;
  data_inicio: string;
  progresso: number;
}

interface ProgramaOriginal {
  id: string;
  nome: string;
  descricao: string;
  nivel: string;
  frequencia_semanal: number;
  duracao_semanas: number;
  objetivo: string[];
  split: string;
}

interface TreinoUsuario {
  id: string;
  treino_original_id: string;
  nome: string;
  ordem_semana: number;
  concluido: boolean;
  pulado: boolean;
  data_concluido: string | null;
}

interface TreinoOriginal {
  id: string;
  nome: string;
  nome_personalizado: string | null;
}

export default function ActiveProgram() {
  const navigate = useNavigate();
  const [programaUsuario, setProgramaUsuario] = useState<ProgramaUsuario | null>(null);
  const [programaOriginal, setProgramaOriginal] = useState<ProgramaOriginal | null>(null);
  const [treinos, setTreinos] = useState<TreinoUsuario[]>([]);
  const [treinosOriginais, setTreinosOriginais] = useState<TreinoOriginal[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [selectedTreinoId, setSelectedTreinoId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  useEffect(() => {
    async function fetchActiveProgram() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Usuário não logado",
            description: "Faça login para ver seu programa ativo.",
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }
        
        const { data: programaUsuarioData, error: programaError } = await supabase
          .from('programas_usuario')
          .select('*')
          .eq('usuario_id', user.id)
          .eq('ativo', true)
          .single();

        if (programaError) {
          if (programaError.code === 'PGRST116') {
            toast({
              title: "Nenhum programa ativo",
              description: "Você ainda não selecionou um programa de treino.",
            });
            navigate('/programs');
            return;
          }
          throw programaError;
        }

        setProgramaUsuario(programaUsuarioData);

        const { data: programaOriginalData, error: originalError } = await supabase
          .from('programas')
          .select('*')
          .eq('id', programaUsuarioData.programa_original_id)
          .single();

        if (originalError) throw originalError;

        setProgramaOriginal(programaOriginalData);

        const { data: treinosData, error: treinosError } = await supabase
          .from('treinos_usuario')
          .select('*')
          .eq('programa_usuario_id', programaUsuarioData.id)
          .order('ordem_semana', { ascending: true })
          .order('created_at', { ascending: true });

        if (treinosError) throw treinosError;

        setTreinos(treinosData || []);

        if (treinosData && treinosData.length > 0) {
          const treinoOriginalIds = treinosData.map(t => t.treino_original_id);
          const { data: treinosOriginaisData, error: treinosOriginaisError } = await supabase
            .from('treinos')
            .select('id, nome, nome_personalizado')
            .in('id', treinoOriginalIds);

          if (treinosOriginaisError) throw treinosOriginaisError;

          setTreinosOriginais(treinosOriginaisData || []);
        }
      } catch (error: any) {
        console.error(error);
        toast({
          title: "Erro ao carregar programa",
          description: error.message || "Não foi possível carregar o programa ativo.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchActiveProgram();
  }, [navigate]);

  const navigateToWorkout = (treinoId: string) => {
    navigate(`/workout/${treinoId}`);
  };

  const getProgramProgress = () => {
    if (!treinos.length) return 0;
    const completedWorkouts = treinos.filter(treino => treino.concluido).length;
    return Math.round((completedWorkouts / treinos.length) * 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).format(date);
  };

  const getWeekNumber = (index: number, frequenciaSemanal: number) => {
    return Math.floor(index / frequenciaSemanal) + 1;
  };

  const getTreinoDisplayName = (treino: TreinoUsuario, absoluteIndex: number) => {
    if (!programaOriginal) return treino.nome;
    
    const treinoOriginal = treinosOriginais.find(t => t.id === treino.treino_original_id);
    const nome = treinoOriginal?.nome;
    const nomePersonalizado = treinoOriginal?.nome_personalizado;
    
    const dayNumber = absoluteIndex + 1;
    
    let displayName = `Dia ${dayNumber}`;
    
    if (nome) {
      displayName += `: ${nome}`;
    }
    
    if (nomePersonalizado) {
      displayName += ` - ${nomePersonalizado}`;
    }
    
    return displayName;
  };

  const handleSkipWorkout = async (treinoId: string) => {
    setActionLoading(true);
    try {
      // 1. Buscar exercícios não concluídos do treino
      const { data: exercicios } = await supabase
        .from('exercicios_treino_usuario')
        .select('id, exercicio_original_id, substituto_custom_id, treino_usuario_id')
        .eq('treino_usuario_id', treinoId)
        .eq('concluido', false);

      if (exercicios && exercicios.length > 0) {
        // 2. Marcar todos como concluídos com avaliações neutras
        await supabase
          .from('exercicios_treino_usuario')
          .update({
            concluido: true,
            avaliacao_dificuldade: 'muito_pesado',
            avaliacao_fadiga: 0,
            avaliacao_dor: 0,
            data_avaliacao: new Date().toISOString()
          })
          .eq('treino_usuario_id', treinoId)
          .eq('concluido', false);

        // 3. Buscar programa_usuario_id
        const { data: treino } = await supabase
          .from('treinos_usuario')
          .select('programa_usuario_id')
          .eq('id', treinoId)
          .single();

        // 4. Rodar progressão para cada exercício
        if (treino) {
          for (const ex of exercicios) {
            await precomputeNextExerciseProgression({
              currentExerciseId: ex.id,
              exercicioOriginalId: ex.exercicio_original_id,
              programaUsuarioId: treino.programa_usuario_id,
              avaliacaoDificuldade: 'muito_pesado',
              avaliacaoFadiga: 0,
              customExerciseId: ex.substituto_custom_id
            });
          }
        }
      }

      // 5. Marcar treino como pulado e concluído
      await supabase
        .from('treinos_usuario')
        .update({
          pulado: true,
          concluido: true,
          data_concluido: new Date().toISOString()
        })
        .eq('id', treinoId);

      // 6. Atualizar estado local
      setTreinos(prev => prev.map(t =>
        t.id === treinoId
          ? { ...t, pulado: true, concluido: true, data_concluido: new Date().toISOString() }
          : t
      ));

      sonnerToast.success("Treino pulado com sucesso");
    } catch (error) {
      console.error("Erro ao pular treino:", error);
      sonnerToast.error("Erro ao pular treino");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestartWorkout = async (treinoId: string) => {
    setActionLoading(true);
    try {
      // 1. Resetar exercícios: limpar avaliações e status
      await supabase
        .from('exercicios_treino_usuario')
        .update({
          concluido: false,
          avaliacao_dificuldade: null,
          avaliacao_fadiga: null,
          avaliacao_dor: null,
          data_avaliacao: null
        })
        .eq('treino_usuario_id', treinoId);

      // 2. Resetar treino
      await supabase
        .from('treinos_usuario')
        .update({
          concluido: false,
          pulado: false,
          data_concluido: null
        })
        .eq('id', treinoId);

      // 3. Atualizar estado local
      setTreinos(prev => prev.map(t =>
        t.id === treinoId
          ? { ...t, concluido: false, pulado: false, data_concluido: null }
          : t
      ));

      sonnerToast.success("Treino reiniciado com sucesso");
    } catch (error) {
      console.error("Erro ao reiniciar treino:", error);
      sonnerToast.error("Erro ao reiniciar treino");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishProgram = async () => {
    if (!programaUsuario) return;
    
    try {
      const { error } = await supabase
        .from('programas_usuario')
        .update({ 
          ativo: false,
          finalizado: true, 
          data_finalizado: new Date().toISOString() 
        })
        .eq('id', programaUsuario.id);
        
      if (error) throw error;
      
      sonnerToast.success("Programa finalizado com sucesso!");
      navigate('/programs');
    } catch (error) {
      console.error("Erro ao finalizar programa:", error);
      sonnerToast.error("Erro ao finalizar programa");
    }
  };

  const getCardStyles = (treino: TreinoUsuario) => {
    if (treino.pulado) return "border-red-400 bg-red-900/30 opacity-80";
    if (treino.concluido) return "border-green-400 bg-green-900/30 opacity-80";
    return "border-primary/20";
  };

  return (
    <div className="pb-20">
      <PageHeader title="Meu Programa Ativo">
        <Button variant="outline" onClick={() => navigate("/programs")}>
          Voltar
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center my-8">
          <p>Carregando seu programa ativo...</p>
        </div>
      ) : !programaUsuario || !programaOriginal ? (
        <div className="text-center my-8">
          <p className="text-muted-foreground">Você não possui um programa ativo.</p>
          <Button onClick={() => navigate("/program-catalog")} className="mt-4">
            Escolher um programa
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cabeçalho do programa */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <h2 className="font-semibold text-xl">{programaOriginal.nome}</h2>
                <p className="text-sm text-muted-foreground">
                  {programaOriginal.descricao || `Programa de treino ${programaOriginal.nivel}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {programaOriginal.nivel === 'iniciante' ? 'Iniciante' : 
                     programaOriginal.nivel === 'intermediario' ? 'Intermediário' : 'Avançado'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {programaOriginal.frequencia_semanal}x por semana
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {programaOriginal.duracao_semanas} semanas
                  </Badge>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="flex items-center gap-1 text-sm mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Iniciado em: {formatDate(programaUsuario.data_inicio)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm">Progresso</span>
                <span className="text-sm font-medium">{getProgramProgress()}%</span>
              </div>
              <Progress value={getProgramProgress()} className="h-2" />
            </div>
          </div>

          {/* Lista de treinos */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Treinos</h3>
            
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
              {treinos.map((treino, index) => {
                const weekNumber = getWeekNumber(index, programaOriginal.frequencia_semanal);
                const prevWeekNumber = index > 0 ? getWeekNumber(index - 1, programaOriginal.frequencia_semanal) : 0;
                const isNewWeek = weekNumber !== prevWeekNumber;
                const displayName = getTreinoDisplayName(treino, index);
                const canSkip = !treino.concluido && !treino.pulado;
                const canRestart = treino.concluido || treino.pulado;
                
                return (
                  <Fragment key={treino.id}>
                    {isNewWeek && (
                      <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
                        <div className="h-px flex-1 bg-border"></div>
                        <span className="text-sm font-semibold text-muted-foreground px-2">
                          Semana {weekNumber}
                        </span>
                        <div className="h-px flex-1 bg-border"></div>
                      </div>
                    )}
                    <Card 
                      className={`p-4 hover:bg-muted/10 transition-colors cursor-pointer ${getCardStyles(treino)}`}
                      onClick={() => navigateToWorkout(treino.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{displayName}</h4>
                          <p className="text-sm text-muted-foreground">Semana {weekNumber}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              disabled={!canSkip}
                              onClick={() => {
                                setSelectedTreinoId(treino.id);
                                setSkipDialogOpen(true);
                              }}
                            >
                              <SkipForward className="h-4 w-4 mr-2" />
                              Pular este treino
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!canRestart}
                              onClick={() => {
                                setSelectedTreinoId(treino.id);
                                setRestartDialogOpen(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Reiniciar este treino
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Status icon at bottom */}
                      {treino.concluido && (
                        <div className="mt-3 flex items-center gap-2">
                          {treino.pulado ? (
                            <>
                              <XCircle className="h-6 w-6 text-red-500" />
                              <span className="text-xs text-red-400">Pulado</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-6 w-6 text-green-500" />
                              {treino.data_concluido && (
                                <span className="text-xs text-muted-foreground">
                                  Concluído em: {formatDate(treino.data_concluido)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </Card>
                  </Fragment>
                );
              })}
            </div>
            
            {/* Botão Concluir Programa quando 100% */}
            {getProgramProgress() === 100 && (
              <div className="mt-8 p-6 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                <Trophy className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-green-400 mb-2">
                  Parabéns! Você completou todos os treinos!
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Finalize o programa para movê-lo para o histórico.
                </p>
                <Button 
                  onClick={handleFinishProgram}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Concluir Programa
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog: Pular treino */}
      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pular treino</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja pular este treino sem fazê-lo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={async () => {
                if (selectedTreinoId) {
                  await handleSkipWorkout(selectedTreinoId);
                }
                setSkipDialogOpen(false);
                setSelectedTreinoId(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, pular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Reiniciar treino */}
      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reiniciar treino</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reiniciar este treino? Seus dados anteriores serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={async () => {
                if (selectedTreinoId) {
                  await handleRestartWorkout(selectedTreinoId);
                }
                setRestartDialogOpen(false);
                setSelectedTreinoId(null);
              }}
            >
              Sim, reiniciar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
