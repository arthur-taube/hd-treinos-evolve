import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SetDataAdvanced } from "./useExerciseStateAdvanced";
import { computeStarProgression, epley1RM } from "@/utils/starProgression";
import type { StarARAResult } from "../ARAStarFeedbackDialog";

interface ExerciseAdvanced {
  id: string;
  nome: string;
  exercicio_original_id: string | null;
  card_original_id?: string | null;
  substituto_custom_id?: string | null;
  concluido: boolean;
  treino_usuario_id: string;
  repeticoes?: string | null;
  incremento_minimo?: number | null;
}

export const useExerciseActionsAdvanced = (
  exercise: ExerciseAdvanced,
  sets: SetDataAdvanced[],
  setSets: React.Dispatch<React.SetStateAction<SetDataAdvanced[]>>,
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>,
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>,
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
  originalSetCount?: number
) => {
  const handleSetComplete = async (index: number) => {
    const newSets = [...sets];
    const currentSet = newSets[index];

    if (currentSet.weight === null || currentSet.weight === undefined || !currentSet.reps || currentSet.reps <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Preencha peso e repetições antes de concluir a série.",
        variant: "destructive"
      });
      return;
    }

    currentSet.completed = !currentSet.completed;
    setSets(newSets);

    try {
      // save_series uses exercicio_usuario_id which works with the FK
      // But the FK points to exercicios_treino_usuario, not avancado.
      // We need to save directly to series_exercicio_usuario
      const { data: existingSeries } = await supabase
        .from('series_exercicio_usuario')
        .select('id')
        .eq('exercicio_usuario_id', exercise.id)
        .eq('numero_serie', index + 1);

      if (existingSeries && existingSeries.length > 0) {
        await supabase
          .from('series_exercicio_usuario')
          .update({
            peso: currentSet.weight,
            repeticoes: currentSet.reps,
            concluida: currentSet.completed,
            nota: currentSet.note || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSeries[0].id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from('series_exercicio_usuario')
          .insert({
            exercicio_usuario_id: exercise.id,
            user_id: user?.id,
            numero_serie: index + 1,
            peso: currentSet.weight,
            repeticoes: currentSet.reps,
            concluida: currentSet.completed,
            nota: currentSet.note || null
          });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar série",
        description: error.message,
        variant: "destructive"
      });
      currentSet.completed = !currentSet.completed;
      setSets([...newSets]);
    }
  };

  const handleWeightChange = (index: number, value: string) => {
    const newSets = [...sets];
    newSets[index].weight = value === '' ? null : (isNaN(Number(value)) ? null : Number(value));
    setSets(newSets);
  };

  const handleRepsChange = (index: number, reps: number) => {
    const newSets = [...sets];
    newSets[index].reps = reps;
    setSets(newSets);
  };

  const handleWeightFocus = (index: number, suggestedWeight: number) => {
    const newSets = [...sets];
    if (newSets[index].weight === null) {
      newSets[index].weight = suggestedWeight;
      setSets(newSets);
    }
  };

  const handleNoteChange = (index: number, note: string) => {
    const newSets = [...sets];
    newSets[index].note = note;
    setSets(newSets);
  };

  const saveSetNote = async (index: number, note: string) => {
    try {
      const { data: existingSeries } = await supabase
        .from('series_exercicio_usuario')
        .select('id')
        .eq('exercicio_usuario_id', exercise.id)
        .eq('numero_serie', index + 1);

      if (existingSeries && existingSeries.length > 0) {
        await supabase
          .from('series_exercicio_usuario')
          .update({ nota: note || null, updated_at: new Date().toISOString() })
          .eq('id', existingSeries[0].id);
      }
      // If no series saved yet, note will be saved when set is completed
    } catch (error: any) {
      console.error('Error saving note:', error);
    }
  };

  const handleExerciseComplete = async (): Promise<boolean> => {
    if (exercise.concluido) return false;

    const completedSets = sets.filter(set => set.completed);
    if (completedSets.length === 0) {
      toast({
        title: "Nenhuma série concluída",
        description: "Complete pelo menos uma série antes de finalizar o exercício.",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Persist updated set count if changed
      if (originalSetCount !== undefined && sets.length !== originalSetCount) {
        await supabase
          .from('exercicios_treino_usuario_avancado')
          .update({ series: sets.length })
          .eq('id', exercise.id);
      }

      await onExerciseComplete(exercise.id, true);
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao concluir exercício",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const saveARAFeedback = async (pumpValue: number, fadigaValue: number) => {
    try {
      // 1. Save feedback on current exercise
      const { error } = await supabase
        .from('exercicios_treino_usuario_avancado')
        .update({
          avaliacao_pump: pumpValue,
          avaliacao_fadiga: fadigaValue,
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', exercise.id);

      if (error) throw error;

      // 2. Calculate new series for next week
      const { data: currentExercise } = await supabase
        .from('exercicios_treino_usuario_avancado')
        .select(`
          series,
          card_original_id,
          exercicio_original_id,
          substituto_custom_id,
          treino_usuario_id,
          treinos_usuario!inner(programa_usuario_id, ordem_semana)
        `)
        .eq('id', exercise.id)
        .single();

      if (currentExercise) {
        const currentSeries = Number(currentExercise.series);
        const rawSeries = currentSeries + pumpValue + fadigaValue;

        if (rawSeries >= 1) {
          const programaUsuarioId = (currentExercise.treinos_usuario as any).programa_usuario_id;
          const currentWeek = (currentExercise.treinos_usuario as any).ordem_semana;

          // Find all future workout IDs in this program
          const { data: futureWorkouts } = await supabase
            .from('treinos_usuario')
            .select('id, ordem_semana')
            .eq('programa_usuario_id', programaUsuarioId)
            .gt('ordem_semana', currentWeek)
            .order('ordem_semana', { ascending: true });

          if (futureWorkouts && futureWorkouts.length > 0) {
            const nextWeek = futureWorkouts[0].ordem_semana;
            const nextWeekWorkoutIds = futureWorkouts
              .filter(w => w.ordem_semana === nextWeek)
              .map(w => w.id);

            // Build query to find next instance
            let query = supabase
              .from('exercicios_treino_usuario_avancado')
              .update({ series: rawSeries })
              .eq('concluido', false)
              .in('treino_usuario_id', nextWeekWorkoutIds);

            if (currentExercise.card_original_id) {
              query = query.eq('card_original_id', currentExercise.card_original_id);
            } else if (currentExercise.exercicio_original_id) {
              query = query.eq('exercicio_original_id', currentExercise.exercicio_original_id);
            } else if (currentExercise.substituto_custom_id) {
              query = query.eq('substituto_custom_id', currentExercise.substituto_custom_id);
            }

            await query;
          }
        }
      }

      setIsOpen(false);
      toast({ title: "Avaliação salva", description: "Feedback ARA registrado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar avaliação", description: error.message, variant: "destructive" });
    }
  };

  const saveAMPFeedback = async (ampValue: number) => {
    try {
      // 1. Save feedback on current exercise
      const { error } = await supabase
        .from('exercicios_treino_usuario_avancado')
        .update({
          avaliacao_performance: ampValue,
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', exercise.id);

      if (error) throw error;

      // 2. Calculate new series for next week
      const { data: currentExercise } = await supabase
        .from('exercicios_treino_usuario_avancado')
        .select(`
          series,
          card_original_id,
          exercicio_original_id,
          substituto_custom_id,
          treino_usuario_id,
          treinos_usuario!inner(programa_usuario_id, ordem_semana)
        `)
        .eq('id', exercise.id)
        .single();

      if (currentExercise) {
        const currentSeries = Number(currentExercise.series);
        const rawSeries = currentSeries + ampValue;

        if (rawSeries >= 1) {
          const programaUsuarioId = (currentExercise.treinos_usuario as any).programa_usuario_id;
          const currentWeek = (currentExercise.treinos_usuario as any).ordem_semana;

          const { data: futureWorkouts } = await supabase
            .from('treinos_usuario')
            .select('id, ordem_semana')
            .eq('programa_usuario_id', programaUsuarioId)
            .gt('ordem_semana', currentWeek)
            .order('ordem_semana', { ascending: true });

          if (futureWorkouts && futureWorkouts.length > 0) {
            const nextWeek = futureWorkouts[0].ordem_semana;
            const nextWeekWorkoutIds = futureWorkouts
              .filter(w => w.ordem_semana === nextWeek)
              .map(w => w.id);

            let query = supabase
              .from('exercicios_treino_usuario_avancado')
              .update({ series: rawSeries })
              .eq('concluido', false)
              .in('treino_usuario_id', nextWeekWorkoutIds);

            if (currentExercise.card_original_id) {
              query = query.eq('card_original_id', currentExercise.card_original_id);
            } else if (currentExercise.exercicio_original_id) {
              query = query.eq('exercicio_original_id', currentExercise.exercicio_original_id);
            } else if (currentExercise.substituto_custom_id) {
              query = query.eq('substituto_custom_id', currentExercise.substituto_custom_id);
            }

            await query;
          }
        }
      }

      setIsOpen(false);
      toast({ title: "Avaliação salva", description: "Feedback AMP registrado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar avaliação", description: error.message, variant: "destructive" });
    }
  };

  const saveObservation = async (
    observation: string,
    setShowObservationInput: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    try {
      const { error } = await supabase
        .from('exercicios_treino_usuario_avancado')
        .update({ observacao: observation })
        .eq('id', exercise.id);

      if (error) throw error;

      // Replicate to future exercises
      const { data: currentExercise } = await supabase
        .from('exercicios_treino_usuario_avancado')
        .select(`
          exercicio_original_id,
          card_original_id,
          substituto_custom_id,
          treino_usuario_id,
          treinos_usuario!inner(programa_usuario_id)
        `)
        .eq('id', exercise.id)
        .single();

      if (currentExercise) {
        const { data: workoutIds } = await supabase
          .from('treinos_usuario')
          .select('id')
          .eq('programa_usuario_id', (currentExercise.treinos_usuario as any).programa_usuario_id);

        if (workoutIds) {
          let replicationQuery = supabase
            .from('exercicios_treino_usuario_avancado')
            .update({ observacao: observation })
            .eq('concluido', false)
            .in('treino_usuario_id', workoutIds.map(w => w.id));

          if (currentExercise.card_original_id) {
            replicationQuery = replicationQuery.eq('card_original_id', currentExercise.card_original_id);
          } else if (currentExercise.exercicio_original_id) {
            replicationQuery = replicationQuery.eq('exercicio_original_id', currentExercise.exercicio_original_id);
          } else if (currentExercise.substituto_custom_id) {
            replicationQuery = replicationQuery.eq('substituto_custom_id', currentExercise.substituto_custom_id);
          }

          await replicationQuery;
        }
      }

      toast({ title: "Observação salva", description: "Observação salva e replicada para exercícios futuros!" });
      setShowObservationInput(false);
    } catch (error: any) {
      toast({ title: "Erro ao salvar observação", description: error.message, variant: "destructive" });
    }
  };

  const skipIncompleteSets = async () => {
    try {
      await onExerciseComplete(exercise.id, true);
      setIsOpen(false);
      toast({ title: "Exercício finalizado", description: "Exercício marcado como concluído." });
    } catch (error: any) {
      toast({ title: "Erro ao finalizar exercício", description: error.message, variant: "destructive" });
    }
  };

  // ---- STAR (intermediate) ARA feedback: Fadiga + Performance + optional Recovery ----
  const saveStarARAFeedback = async (result: StarARAResult) => {
    try {
      const { fadigaValue, performance, recuperacao } = result;

      // 1. Save feedback on current exercise
      const { error } = await supabase
        .from("exercicios_treino_usuario_avancado")
        .update({
          avaliacao_fadiga: fadigaValue,
          avaliacao_desempenho: performance,
          avaliacao_recuperacao: recuperacao,
          data_avaliacao: new Date().toISOString(),
        })
        .eq("id", exercise.id);
      if (error) throw error;

      // 2. Load current exercise context
      const { data: currentExercise } = await supabase
        .from("exercicios_treino_usuario_avancado")
        .select(
          `series, card_original_id, exercicio_original_id, substituto_custom_id,
           incremento_minimo, repeticoes, treino_usuario_id,
           treinos_usuario!inner(programa_usuario_id, ordem_semana)`
        )
        .eq("id", exercise.id)
        .single();

      if (!currentExercise) {
        setIsOpen(false);
        return;
      }

      const programaUsuarioId = (currentExercise.treinos_usuario as any).programa_usuario_id;
      const currentWeek = (currentExercise.treinos_usuario as any).ordem_semana;
      const currentSeries = Number(currentExercise.series);

      // Helper to build the "same exercise" matcher
      const applyMatch = (q: any) => {
        if (currentExercise.card_original_id) return q.eq("card_original_id", currentExercise.card_original_id);
        if (currentExercise.exercicio_original_id) return q.eq("exercicio_original_id", currentExercise.exercicio_original_id);
        if (currentExercise.substituto_custom_id) return q.eq("substituto_custom_id", currentExercise.substituto_custom_id);
        return q;
      };

      // 3. Find next week's workout ids
      const { data: futureWorkouts } = await supabase
        .from("treinos_usuario")
        .select("id, ordem_semana")
        .eq("programa_usuario_id", programaUsuarioId)
        .gt("ordem_semana", currentWeek)
        .order("ordem_semana", { ascending: true });

      let nextWeekWorkoutIds: string[] = [];
      if (futureWorkouts && futureWorkouts.length > 0) {
        const nextWeek = futureWorkouts[0].ordem_semana;
        nextWeekWorkoutIds = futureWorkouts.filter((w) => w.ordem_semana === nextWeek).map((w) => w.id);
      }

      // 4. Series for next week = current + fadiga (ART will add later, at next session)
      const rawSeries = currentSeries + fadigaValue;
      if (nextWeekWorkoutIds.length > 0 && rawSeries >= 1) {
        await applyMatch(
          supabase
            .from("exercicios_treino_usuario_avancado")
            .update({ series: rawSeries })
            .eq("concluido", false)
            .in("treino_usuario_id", nextWeekWorkoutIds)
        );
      }

      // 5. Deload decision (only when performance regressed)
      if (performance === "pior" && nextWeekWorkoutIds.length > 0) {
        const recScore = recuperacao ?? 0;

        // Trend of first-set Epley 1RM over last 3 completed instances
        const trendScore = await getStarTrendScore(
          programaUsuarioId,
          currentExercise.card_original_id,
          currentExercise.exercicio_original_id,
          currentExercise.substituto_custom_id
        );

        const fatigaExtremaScore = fadigaValue === -0.75 ? 1 : 0;
        const total = recScore + trendScore + fatigaExtremaScore;

        if (total >= 3) {
          // Compute the suggested progression (base) this deload week WOULD have used,
          // from the current week's executed first set — store it for the return week.
          const { data: seriesData } = await supabase.rpc("get_series_by_exercise", {
            exercise_id: exercise.id,
          });
          let baseWeight: number | null = null;
          let baseReps: number | null = null;
          if (seriesData && seriesData.length > 0) {
            const firstSet = [...seriesData].sort((a, b) => a.numero_serie - b.numero_serie)[0];
            const prog = computeStarProgression(
              firstSet.peso,
              firstSet.repeticoes,
              Number(currentExercise.incremento_minimo) || 2.5,
              currentExercise.repeticoes
            );
            if (prog) {
              baseWeight = prog.weight;
              baseReps = prog.reps;
            } else {
              baseWeight = firstSet.peso;
              baseReps = firstSet.repeticoes;
            }
          }

          await applyMatch(
            supabase
              .from("exercicios_treino_usuario_avancado")
              .update({
                deload: true,
                progressao_base_peso: baseWeight,
                progressao_base_reps: baseReps,
              })
              .eq("concluido", false)
              .in("treino_usuario_id", nextWeekWorkoutIds)
          );
        }
      }

      setIsOpen(false);
      toast({ title: "Avaliação salva", description: "Feedback registrado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar avaliação", description: error.message, variant: "destructive" });
    }
  };

  // Trend score from the last 3 completed instances' first-set Epley 1RM.
  const getStarTrendScore = async (
    programaUsuarioId: string,
    cardOriginalId: string | null,
    exercicioOriginalId: string | null,
    substitutoCustomId: string | null
  ): Promise<number> => {
    try {
      let q = supabase
        .from("exercicios_treino_usuario_avancado")
        .select(`id, updated_at, treinos_usuario!inner(programa_usuario_id, ordem_semana)`)
        .eq("concluido", true)
        .eq("treinos_usuario.programa_usuario_id", programaUsuarioId)
        .order("ordem_semana", { ascending: false, foreignTable: "treinos_usuario" })
        .limit(3);

      if (cardOriginalId) q = q.eq("card_original_id", cardOriginalId);
      else if (exercicioOriginalId) q = q.eq("exercicio_original_id", exercicioOriginalId);
      else if (substitutoCustomId) q = q.eq("substituto_custom_id", substitutoCustomId);

      const { data: instances } = await q;
      if (!instances || instances.length < 2) return 0;

      // instances are newest → oldest; compute 1RM for each
      const oneRMs: number[] = [];
      for (const inst of instances) {
        const { data: series } = await supabase.rpc("get_series_by_exercise", { exercise_id: inst.id });
        if (series && series.length > 0) {
          const first = [...series].sort((a, b) => a.numero_serie - b.numero_serie)[0];
          oneRMs.push(epley1RM(first.peso, first.repeticoes));
        }
      }
      if (oneRMs.length < 2) return 0;

      // Order oldest → newest for readability: [.., prev, current]
      const chron = [...oneRMs].reverse();
      const n = chron.length;
      const current = chron[n - 1];
      const prev = chron[n - 2];
      const EPS = 0.5;

      if (current > prev + EPS) return 0; // rose at the end
      if (Math.abs(current - prev) <= EPS) return 0.5; // maintained after a drop
      return 1; // still falling
    } catch {
      return 0;
    }
  };

  return {
    handleSetComplete,
    handleWeightChange,
    handleRepsChange,
    handleWeightFocus,
    handleNoteChange,
    saveSetNote,
    handleExerciseComplete,
    saveARAFeedback,
    saveAMPFeedback,
    saveStarARAFeedback,
    saveObservation,
    skipIncompleteSets
  };
};
