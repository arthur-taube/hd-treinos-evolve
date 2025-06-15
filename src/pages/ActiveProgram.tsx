
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckCircle } from "lucide-react";

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
  data_concluido: string | null;
}

export default function ActiveProgram() {
  const navigate = useNavigate();
  const [programaUsuario, setProgramaUsuario] = useState<ProgramaUsuario | null>(null);
  const [programaOriginal, setProgramaOriginal] = useState<ProgramaOriginal | null>(null);
  const [treinos, setTreinos] = useState<TreinoUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchActiveProgram() {
      try {
        // Buscar usuário atual
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
        
        // Buscar programa ativo do usuário
        const { data: programaUsuarioData, error: programaError } = await supabase
          .from('programas_usuario')
          .select('*')
          .eq('usuario_id', user.id)
          .eq('ativo', true)
          .single();

        if (programaError) {
          if (programaError.code === 'PGRST116') {
            // Código específico para "não encontrado"
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

        // Buscar detalhes do programa original
        const { data: programaOriginalData, error: originalError } = await supabase
          .from('programas')
          .select('*')
          .eq('id', programaUsuarioData.programa_original_id)
          .single();

        if (originalError) throw originalError;

        setProgramaOriginal(programaOriginalData);

        // Buscar treinos do usuário - CORRIGIDO: manter ordem cronológica sempre
        const { data: treinosData, error: treinosError } = await supabase
          .from('treinos_usuario')
          .select('*')
          .eq('programa_usuario_id', programaUsuarioData.id)
          .order('ordem_semana', { ascending: true });

        if (treinosError) throw treinosError;

        setTreinos(treinosData || []);
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

          {/* Lista de treinos - MANTENDO SEMPRE A ORDEM CRONOLÓGICA */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Treinos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {treinos.map((treino, index) => {
                const weekNumber = getWeekNumber(index, programaOriginal.frequencia_semanal);
                return (
                  <Card 
                    key={treino.id} 
                    className={`p-4 hover:bg-muted/10 transition-colors cursor-pointer ${
                      treino.concluido ? "border-green-200 bg-green-50/50" : ""
                    }`}
                    onClick={() => navigateToWorkout(treino.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Dia {(index % programaOriginal.frequencia_semanal) + 1}: {treino.nome}</h4>
                        <p className="text-sm text-muted-foreground">Semana {weekNumber}</p>
                      </div>
                      {treino.concluido && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {treino.concluido && treino.data_concluido && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Concluído em: {formatDate(treino.data_concluido)}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
