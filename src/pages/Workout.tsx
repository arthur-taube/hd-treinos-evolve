
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, CheckCircle, ChevronRight } from "lucide-react";
import { ExerciseCard } from "@/components/workout/ExerciseCard";

interface TreinoUsuario {
  id: string;
  nome: string;
  ordem_semana: number;
  programa_usuario_id: string;
}

interface ExercicioUsuario {
  id: string;
  nome: string;
  grupo_muscular: string;
  series: number;
  repeticoes: string | null;
  oculto: boolean;
  ordem: number;
  concluido: boolean;
  peso: number | null;
  observacao?: string | null;
  video_url?: string | null;
}

export default function Workout() {
  const { treinoId } = useParams<{ treinoId: string }>();
  const navigate = useNavigate();
  const [treino, setTreino] = useState<TreinoUsuario | null>(null);
  const [exercicios, setExercicios] = useState<ExercicioUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    async function fetchWorkoutData() {
      if (!treinoId) return;

      try {
        // Buscar dados do treino
        const { data: treinoData, error: treinoError } = await supabase
          .from('treinos_usuario')
          .select('*')
          .eq('id', treinoId)
          .single();

        if (treinoError) throw treinoError;

        setTreino(treinoData);

        // Buscar exercícios do treino
        const { data: exerciciosData, error: exerciciosError } = await supabase
          .from('exercicios_treino_usuario')
          .select('*')
          .eq('treino_usuario_id', treinoId)
          .order('ordem', { ascending: true });

        if (exerciciosError) throw exerciciosError;

        setExercicios(exerciciosData || []);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar treino",
          description: error.message || "Não foi possível carregar os dados do treino.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchWorkoutData();
  }, [treinoId]);

  const toggleExerciseCompletion = async (exerciseId: string, isCompleted: boolean) => {
    // Atualizar localmente primeiro para UI responsiva
    setExercicios(prev => 
      prev.map(ex => ex.id === exerciseId ? { ...ex, concluido: isCompleted } : ex)
    );

    try {
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ concluido: isCompleted })
        .eq('id', exerciseId);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar exercício",
        description: error.message || "Não foi possível atualizar o status do exercício.",
        variant: "destructive"
      });
      
      // Reverter mudança local em caso de erro
      setExercicios(prev => 
        prev.map(ex => ex.id === exerciseId ? { ...ex, concluido: !isCompleted } : ex)
      );
    }
  };

  const updateExerciseWeight = async (exerciseId: string, weight: number) => {
    // Atualizar localmente primeiro
    setExercicios(prev => 
      prev.map(ex => ex.id === exerciseId ? { ...ex, peso: weight } : ex)
    );
    
    try {
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ peso: weight })
        .eq('id', exerciseId);
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar peso",
        description: error.message || "Não foi possível salvar o peso do exercício.",
        variant: "destructive"
      });
    }
  };

  const completeWorkout = async () => {
    if (!treino) return;
    
    setSaving(true);
    try {
      // Marcar todos os exercícios como concluídos
      const { error: exerciciosError } = await supabase
        .from('exercicios_treino_usuario')
        .update({ concluido: true })
        .eq('treino_usuario_id', treino.id);
        
      if (exerciciosError) throw exerciciosError;
      
      // Marcar o treino como concluído
      const { error: treinoError } = await supabase
        .from('treinos_usuario')
        .update({ 
          concluido: true,
          data_concluido: new Date().toISOString()
        })
        .eq('id', treino.id);
        
      if (treinoError) throw treinoError;
      
      // Atualizar estado local
      setExercicios(prev => prev.map(ex => ({ ...ex, concluido: true })));
      
      toast({
        title: "Treino concluído!",
        description: "Parabéns! Seu treino foi registrado como concluído."
      });
      
      // Voltar para a página do programa ativo
      navigate('/active-program');
    } catch (error: any) {
      toast({
        title: "Erro ao concluir treino",
        description: error.message || "Não foi possível registrar o treino como concluído.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const findAdjacentWorkout = async (direction: 'next' | 'previous') => {
    if (!treino) return null;
    
    try {
      // Buscar todos os treinos do programa
      const { data: treinos } = await supabase
        .from('treinos_usuario')
        .select('*')
        .eq('programa_usuario_id', treino.programa_usuario_id)
        .order('ordem_semana', { ascending: true });
        
      if (!treinos || treinos.length === 0) return null;
      
      // Encontrar o índice do treino atual
      const currentIndex = treinos.findIndex(t => t.id === treino.id);
      if (currentIndex === -1) return null;
      
      // Buscar o próximo ou anterior treino
      const targetIndex = direction === 'next' 
        ? currentIndex + 1 
        : currentIndex - 1;
        
      // Verificar se o índice está dentro dos limites
      if (targetIndex < 0 || targetIndex >= treinos.length) return null;
      
      return treinos[targetIndex].id;
    } catch (error) {
      console.error('Erro ao buscar treino adjacente:', error);
      return null;
    }
  };

  const navigateToAdjacentWorkout = async (direction: 'next' | 'previous') => {
    const adjacentWorkoutId = await findAdjacentWorkout(direction);
    if (adjacentWorkoutId) {
      navigate(`/workout/${adjacentWorkoutId}`);
    } else {
      toast({
        title: `Não há treino ${direction === 'next' ? 'próximo' : 'anterior'}`,
        description: `Este é o ${direction === 'next' ? 'último' : 'primeiro'} treino do programa.`
      });
    }
  };

  const isAllExercisesCompleted = () => {
    return exercicios.length > 0 && exercicios.every(ex => ex.concluido);
  };

  return (
    <div className="pb-20">
      <PageHeader title={treino?.nome || "Carregando..."}>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateToAdjacentWorkout('previous')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate("/active-program")}
          >
            Voltar ao Programa
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateToAdjacentWorkout('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center my-8">
          <p>Carregando detalhes do treino...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {exercicios
              .filter(ex => !ex.oculto)
              .map((exercicio) => (
                <ExerciseCard 
                  key={exercicio.id}
                  exercise={exercicio}
                  onExerciseComplete={toggleExerciseCompletion}
                  onWeightUpdate={updateExerciseWeight}
                />
              ))}
          </div>
          
          <div className="pt-4">
            <Button 
              className="w-full" 
              onClick={completeWorkout} 
              disabled={saving || isAllExercisesCompleted()}
            >
              {saving ? "Salvando..." : isAllExercisesCompleted() ? "Treino Concluído!" : "Concluir Treino"}
              {isAllExercisesCompleted() && <CheckCircle className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
