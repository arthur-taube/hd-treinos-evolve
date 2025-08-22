import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Calendar, Clock, Target } from "lucide-react";

interface Exercise {
  id: string;
  nome: string;
  grupo_muscular: string;
  primary_muscle: string;
  secondary_muscle?: string;
  exercicio_original_id: string;
  series: number;
  repeticoes: string | null;
  peso: number | null;
  concluido: boolean;
  observacao?: string | null;
  video_url?: string | null;
  configuracao_inicial?: boolean;
  reps_programadas?: number | null;
  incremento_minimo?: number | null;
  treino_usuario_id: string;
}

export default function Workout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingWorkout, setCompletingWorkout] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWorkout();
    }
  }, [id]);

  const fetchWorkout = async () => {
    try {
      const { data: workoutData, error: workoutError } = await supabase
        .from('treinos_usuario')
        .select(`
          id,
          nome,
          data_concluido,
          concluido,
          programas_usuario (
            nome
          )
        `)
        .eq('id', id)
        .single();

      if (workoutError) throw workoutError;

      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercicios_treino_usuario')
        .select(`
          id,
          nome,
          grupo_muscular,
          primary_muscle,
          secondary_muscle,
          exercicio_original_id,
          series,
          repeticoes,
          peso,
          concluido,
          observacao,
          video_url,
          configuracao_inicial,
          reps_programadas,
          incremento_minimo,
          treino_usuario_id
        `)
        .eq('treino_usuario_id', id)
        .order('created_at');

      if (exercisesError) throw exercisesError;

      setWorkout(workoutData);
      setExercises(exercisesData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar treino",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseComplete = async (exerciseId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ concluido: isCompleted })
        .eq('id', exerciseId);

      if (error) throw error;

      setExercises(exercises.map(exercise =>
        exercise.id === exerciseId ? { ...exercise, concluido: isCompleted } : exercise
      ));
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar exercício",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleWeightUpdate = async (exerciseId: string, weight: number) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario')
        .update({ peso: weight })
        .eq('id', exerciseId);

      if (error) throw error;

      setExercises(exercises.map(exercise =>
        exercise.id === exerciseId ? { ...exercise, peso: weight } : exercise
      ));
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar peso",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const completeWorkout = async () => {
    setCompletingWorkout(true);
    try {
      const { error } = await supabase
        .from('treinos_usuario')
        .update({ concluido: true, data_concluido: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Treino concluído!",
        description: "Parabéns, seu treino foi finalizado com sucesso.",
      });
      navigate("/workouts");
    } catch (error: any) {
      toast({
        title: "Erro ao concluir treino",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCompletingWorkout(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Carregando treino..." />
      </AppLayout>
    );
  }

  if (!workout) {
    return (
      <AppLayout>
        <PageHeader title="Treino não encontrado" />
      </AppLayout>
    );
  }

  const allExercisesCompleted = exercises.length > 0 && exercises.every(exercise => exercise.concluido);

  return (
    <AppLayout>
      <PageHeader title={workout?.programas_usuario?.nome || "Treino"} />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Informações do Treino</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>{exercises.length} exercícios</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Duração estimada: 45-60 minutos</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>{allExercisesCompleted ? 'Treino concluído' : 'Em andamento'}</span>
          </div>
        </CardContent>
      </Card>

      {exercises.map(exercise => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          onExerciseComplete={handleExerciseComplete}
          onWeightUpdate={handleWeightUpdate}
        />
      ))}

      <Button
        className="w-full"
        onClick={completeWorkout}
        disabled={completingWorkout || allExercisesCompleted}
      >
        {allExercisesCompleted ? "Treino concluído" : "Concluir treino"}
      </Button>
    </AppLayout>
  );
}
