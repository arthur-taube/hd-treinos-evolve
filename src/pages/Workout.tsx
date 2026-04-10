
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, CheckCircle, ChevronRight } from "lucide-react";
import WorkoutTimer from "@/components/workout/WorkoutTimer";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { ExerciseCardAdvanced, ExerciseAdvancedData } from "@/components/workout/ExerciseCardAdvanced";
import { FeedbackDialog } from "@/components/workout/FeedbackDialog";
import { ARTFeedbackDialog } from "@/components/workout/ARTFeedbackDialog";
import { useExerciseFeedback } from "@/hooks/use-exercise-feedback";
import { useARTCheck } from "@/hooks/useARTCheck";
import { applyWorkoutProgression } from "@/utils/workoutProgressionLoader";
import { resolveExerciseRer } from "@/utils/rerResolver";

interface TreinoUsuario {
  id: string;
  nome: string;
  ordem_semana: number;
  programa_usuario_id: string;
  concluido: boolean;
}

interface ExercicioUsuario {
  id: string;
  nome: string;
  grupo_muscular: string;
  primary_muscle: string;
  exercicio_original_id: string;
  card_original_id?: string | null;
  series: number;
  repeticoes: string | null;
  oculto: boolean;
  ordem: number;
  concluido: boolean;
  peso: number | null;
  observacao?: string | null;
  video_url?: string | null;
  configuracao_inicial?: boolean;
  reps_programadas?: number | null;
  incremento_minimo?: number | null;
  treino_usuario_id: string;
  substituicao_neste_treino?: boolean;
  substituto_oficial_id?: string | null;
  substituto_custom_id?: string | null;
  substituto_nome?: string | null;
}

export default function Workout() {
  const { treinoId } = useParams<{ treinoId: string }>();
  const navigate = useNavigate();
  const [treino, setTreino] = useState<TreinoUsuario | null>(null);
  const [exercicios, setExercicios] = useState<ExercicioUsuario[]>([]);
  const [exerciciosAdvanced, setExerciciosAdvanced] = useState<ExerciseAdvancedData[]>([]);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [rerPerWeek, setRerPerWeek] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ART check for advanced workouts
  const {
    pendingExercises: artPendingExercises,
    showARTDialog,
    setShowARTDialog,
    saveARTFeedback,
  } = useARTCheck(
    treino?.programa_usuario_id || null,
    treinoId || null,
    exerciciosAdvanced,
    isAdvanced && !loading
  );
  
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

        // Detect program level
        const { data: programaUsuario } = await supabase
          .from('programas_usuario')
          .select('programa_original_id')
          .eq('id', treinoData.programa_usuario_id)
          .single();

        let programLevel = 'iniciante';
        if (programaUsuario) {
          const { data: programa } = await supabase
            .from('programas')
            .select('nivel')
            .eq('id', programaUsuario.programa_original_id)
            .single();
          if (programa) programLevel = programa.nivel;
        }

        const advanced = programLevel !== 'iniciante';
        setIsAdvanced(advanced);

        if (advanced) {
          await fetchAdvancedExercises(treinoId, treinoData);
        } else {
          // Aplicar progressão automática (only for beginner)
          await applyWorkoutProgression(treinoId);
          await fetchBeginnerExercises(treinoId);
        }
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

  const fetchAdvancedExercises = async (treinoId: string, treinoData: any) => {
    // Fetch exercises from advanced table
    const { data: exerciciosData, error } = await supabase
      .from('exercicios_treino_usuario_avancado')
      .select(`
        id, nome, grupo_muscular, exercicio_original_id, card_original_id,
        series, repeticoes, oculto, ordem, concluido, peso, observacao,
        configuracao_inicial, incremento_minimo, treino_usuario_id,
        rer, metodo_especial, modelo_feedback,
        substituicao_neste_treino, substituto_oficial_id, substituto_custom_id, substituto_nome
      `)
      .eq('treino_usuario_id', treinoId)
      .order('ordem', { ascending: true });

    if (error) throw error;

    // Fetch RER per week from mesociclo
    const { data: treinoOriginal } = await supabase
      .from('treinos')
      .select('mesociclo_id')
      .eq('id', treinoData.treino_original_id)
      .single();

    if (treinoOriginal) {
      const { data: mesociclo } = await supabase
        .from('mesociclos')
        .select('rer_por_semana')
        .eq('id', treinoOriginal.mesociclo_id)
        .single();

      if (mesociclo?.rer_por_semana) {
        setRerPerWeek(mesociclo.rer_por_semana as Record<string, string>);
      }
    }

    setExerciciosAdvanced((exerciciosData || []) as ExerciseAdvancedData[]);
  };

  const fetchBeginnerExercises = async (treinoId: string) => {
    const { data: exerciciosData, error: exerciciosError } = await supabase
      .from('exercicios_treino_usuario')
      .select(`
        id, nome, grupo_muscular, primary_muscle, exercicio_original_id, card_original_id,
        series, repeticoes, oculto, ordem, concluido, peso, observacao, video_url,
        configuracao_inicial, reps_programadas, incremento_minimo, treino_usuario_id,
        substituicao_neste_treino, substituto_oficial_id, substituto_custom_id, substituto_nome
      `)
      .eq('treino_usuario_id', treinoId)
      .order('ordem', { ascending: true });

    if (exerciciosError) throw exerciciosError;

    const exerciciosProcessados = await Promise.all(
      (exerciciosData || []).map(async (exercicio) => {
        if (!exercicio.primary_muscle && exercicio.exercicio_original_id) {
          const { data, error } = await supabase
            .from('exercicios_iniciantes')
            .select('primary_muscle')
            .eq('id', exercicio.exercicio_original_id)
            .single();
          if (!error && data) {
            exercicio.primary_muscle = data.primary_muscle || exercicio.grupo_muscular;
            await supabase
              .from('exercicios_treino_usuario')
              .update({ primary_muscle: data.primary_muscle })
              .eq('id', exercicio.id);
          }
        }
        return exercicio;
      })
    );

    setExercicios(exerciciosProcessados);
  };

  useEffect(() => {
    async function ensureSeriesTable() {
      try {
        await supabase.rpc('ensure_series_table').then(({ error }) => {
          if (error) console.error("Erro ao verificar/criar tabela de séries:", error);
        });
      } catch (error) {
        console.error("Erro ao verificar tabela de séries:", error);
      }
    }
    ensureSeriesTable();
  }, []);

  // --- Shared workout actions (table-conditional) ---
  const tableName = isAdvanced ? 'exercicios_treino_usuario_avancado' : 'exercicios_treino_usuario';

  const toggleExerciseCompletion = async (exerciseId: string, isCompleted: boolean) => {
    if (isAdvanced) {
      setExerciciosAdvanced(prev =>
        prev.map(ex => ex.id === exerciseId ? { ...ex, concluido: isCompleted } : ex)
      );
    } else {
      setExercicios(prev =>
        prev.map(ex => ex.id === exerciseId ? { ...ex, concluido: isCompleted } : ex)
      );
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .update({ concluido: isCompleted })
        .eq('id', exerciseId);
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar exercício",
        description: error.message,
        variant: "destructive"
      });
      // Rollback
      if (isAdvanced) {
        setExerciciosAdvanced(prev =>
          prev.map(ex => ex.id === exerciseId ? { ...ex, concluido: !isCompleted } : ex)
        );
      } else {
        setExercicios(prev =>
          prev.map(ex => ex.id === exerciseId ? { ...ex, concluido: !isCompleted } : ex)
        );
      }
    }
  };

  const updateExerciseWeight = async (exerciseId: string, weight: number) => {
    if (isAdvanced) {
      setExerciciosAdvanced(prev =>
        prev.map(ex => ex.id === exerciseId ? { ...ex, peso: weight } : ex)
      );
    } else {
      setExercicios(prev =>
        prev.map(ex => ex.id === exerciseId ? { ...ex, peso: weight } : ex)
      );
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .update({ peso: weight })
        .eq('id', exerciseId);
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar peso",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const completeWorkout = async () => {
    if (!treino) return;
    setSaving(true);
    try {
      const visibleExercises = isAdvanced
        ? exerciciosAdvanced.filter(ex => !ex.oculto)
        : exercicios.filter(ex => !ex.oculto);

      const { error: exerciciosError } = await supabase
        .from(tableName)
        .update({ concluido: true })
        .in('id', visibleExercises.map(ex => ex.id));
      if (exerciciosError) throw exerciciosError;

      const { error: treinoError } = await supabase
        .from('treinos_usuario')
        .update({ concluido: true, data_concluido: new Date().toISOString() })
        .eq('id', treino.id);
      if (treinoError) throw treinoError;

      if (isAdvanced) {
        setExerciciosAdvanced(prev => prev.map(ex => ex.oculto ? ex : { ...ex, concluido: true }));
      } else {
        setExercicios(prev => prev.map(ex => ex.oculto ? ex : { ...ex, concluido: true }));
      }
      setTreino(prev => prev ? { ...prev, concluido: true } : null);

      toast({ title: "Treino concluído!", description: "Parabéns! Seu treino foi registrado como concluído." });
      navigate('/active-program');
    } catch (error: any) {
      toast({ title: "Erro ao concluir treino", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const findAdjacentWorkout = async (direction: 'next' | 'previous') => {
    if (!treino) return null;
    try {
      const { data: treinos } = await supabase
        .from('treinos_usuario')
        .select('*')
        .eq('programa_usuario_id', treino.programa_usuario_id)
        .order('ordem_semana', { ascending: true });
      if (!treinos || treinos.length === 0) return null;
      const currentIndex = treinos.findIndex(t => t.id === treino.id);
      if (currentIndex === -1) return null;
      const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
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
    const visible = isAdvanced
      ? exerciciosAdvanced.filter(ex => !ex.oculto)
      : exercicios.filter(ex => !ex.oculto);
    return visible.length > 0 && visible.every(ex => ex.concluido);
  };

  const isWorkoutAlreadyCompleted = () => treino?.concluido === true;

  return (
    <div className="pb-20">
      <PageHeader title={treino?.nome || "Carregando..."}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateToAdjacentWorkout('previous')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate("/active-program")}>
            Voltar ao Programa
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateToAdjacentWorkout('next')}>
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
            {isAdvanced
              ? exerciciosAdvanced
                  .filter(ex => !ex.oculto)
                  .map((exercicio) => (
                    <ExerciseCardAdvanced
                      key={exercicio.id}
                      exercise={exercicio}
                      resolvedRer={resolveExerciseRer(
                        exercicio.rer || null,
                        rerPerWeek,
                        treino?.ordem_semana || 1
                      )}
                      onExerciseComplete={toggleExerciseCompletion}
                      onWeightUpdate={updateExerciseWeight}
                    />
                  ))
              : exercicios
                  .filter(ex => !ex.oculto)
                  .map((exercicio) => (
                    <ExerciseCard
                      key={exercicio.id}
                      exercise={exercicio}
                      onExerciseComplete={toggleExerciseCompletion}
                      onWeightUpdate={updateExerciseWeight}
                    />
                  ))
            }
          </div>

          <div className="pt-4">
            <Button
              className="w-full"
              onClick={completeWorkout}
              disabled={saving || isWorkoutAlreadyCompleted() || !isAllExercisesCompleted()}
            >
              {saving ? "Salvando..." :
               isWorkoutAlreadyCompleted() ? "Treino Já Concluído!" :
               isAllExercisesCompleted() ? "Concluir Treino" : "Complete todos os exercícios"}
              {(isAllExercisesCompleted() || isWorkoutAlreadyCompleted()) && <CheckCircle className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* ART Dialog for advanced workouts */}
      {isAdvanced && (
        <ARTFeedbackDialog
          isOpen={showARTDialog}
          pendingExercises={artPendingExercises}
          onSubmit={saveARTFeedback}
        />
      )}
    </div>
  );
}
