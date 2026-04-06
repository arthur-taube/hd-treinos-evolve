import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingARTExercise {
  id: string;
  nome: string;
  grupo_muscular: string;
  series: number;
  avaliacao_pump: number;
  avaliacao_fadiga: number;
  card_original_id: string | null;
  exercicio_original_id: string | null;
  substituto_custom_id: string | null;
  treino_usuario_id: string;
}

export function useARTCheck(
  programaUsuarioId: string | null,
  currentWorkoutId: string | null,
  currentExercises: { exercicio_original_id: string | null; modelo_feedback?: string | null }[],
  isAdvanced: boolean
) {
  const [pendingExercises, setPendingExercises] = useState<PendingARTExercise[]>([]);
  const [showARTDialog, setShowARTDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdvanced || !programaUsuarioId || !currentWorkoutId || currentExercises.length === 0) return;
    checkPendingART();
  }, [isAdvanced, programaUsuarioId, currentWorkoutId, currentExercises.length]);

  const checkPendingART = async () => {
    setLoading(true);
    try {
      // 1. Get muscles of current workout exercises
      const originalIds = currentExercises
        .map(e => e.exercicio_original_id)
        .filter(Boolean) as string[];

      if (originalIds.length === 0) { setLoading(false); return; }

      const { data: currentCatalog } = await supabase
        .from('exercicios_avancados')
        .select('primary_muscle, secondary_muscle, tertiary_muscle, quaternary_muscle')
        .in('id', originalIds);

      if (!currentCatalog || currentCatalog.length === 0) { setLoading(false); return; }

      const currentMuscles = new Set<string>();
      currentCatalog.forEach(e => {
        if (e.primary_muscle) currentMuscles.add(e.primary_muscle);
        if (e.secondary_muscle) currentMuscles.add(e.secondary_muscle);
        if (e.tertiary_muscle) currentMuscles.add(e.tertiary_muscle);
        if (e.quaternary_muscle) currentMuscles.add(e.quaternary_muscle);
      });

      if (currentMuscles.size === 0) { setLoading(false); return; }

      // 2. Get current workout's ordem_semana and ordem_dia
      const { data: currentWorkout } = await supabase
        .from('treinos_usuario')
        .select('ordem_semana, ordem_dia')
        .eq('id', currentWorkoutId)
        .single();

      if (!currentWorkout) { setLoading(false); return; }

      // 3. Get all previous workouts in this program
      const { data: previousWorkouts } = await supabase
        .from('treinos_usuario')
        .select('id, ordem_semana, ordem_dia')
        .eq('programa_usuario_id', programaUsuarioId)
        .or(
          `ordem_semana.lt.${currentWorkout.ordem_semana},` +
          `and(ordem_semana.eq.${currentWorkout.ordem_semana},ordem_dia.lt.${currentWorkout.ordem_dia})`
        );

      if (!previousWorkouts || previousWorkouts.length === 0) { setLoading(false); return; }

      const prevWorkoutIds = previousWorkouts.map(w => w.id);

      // 4. Find exercises with ARA done but ART pending
      const { data: pendingCandidates } = await supabase
        .from('exercicios_treino_usuario_avancado')
        .select('id, nome, grupo_muscular, series, avaliacao_pump, avaliacao_fadiga, card_original_id, exercicio_original_id, substituto_custom_id, treino_usuario_id')
        .in('treino_usuario_id', prevWorkoutIds)
        .not('avaliacao_pump', 'is', null)
        .is('avaliacao_dor', null)
        .eq('concluido', true);

      if (!pendingCandidates || pendingCandidates.length === 0) { setLoading(false); return; }

      // 5. Filter by muscle intersection
      const candidateOriginalIds = pendingCandidates
        .map(c => c.exercicio_original_id)
        .filter(Boolean) as string[];

      if (candidateOriginalIds.length === 0) { setLoading(false); return; }

      const { data: candidateCatalog } = await supabase
        .from('exercicios_avancados')
        .select('id, primary_muscle, secondary_muscle, tertiary_muscle, quaternary_muscle')
        .in('id', candidateOriginalIds);

      const catalogMap = new Map<string, string[]>();
      candidateCatalog?.forEach(e => {
        const muscles = [e.primary_muscle, e.secondary_muscle, e.tertiary_muscle, e.quaternary_muscle]
          .filter(Boolean) as string[];
        catalogMap.set(e.id, muscles);
      });

      const filtered = pendingCandidates.filter(candidate => {
        if (!candidate.exercicio_original_id) return false;
        const muscles = catalogMap.get(candidate.exercicio_original_id) || [];
        return muscles.some(m => currentMuscles.has(m));
      });

      if (filtered.length > 0) {
        setPendingExercises(filtered as PendingARTExercise[]);
        setShowARTDialog(true);
      }
    } catch (error) {
      console.error('Error checking pending ART:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveARTFeedback = async (evaluations: Record<string, number>) => {
    try {
      for (const exercise of pendingExercises) {
        const artValue = evaluations[exercise.id];
        if (artValue === undefined) continue;

        // 1. Save ART on the previous exercise
        await supabase
          .from('exercicios_treino_usuario_avancado')
          .update({
            avaliacao_dor: artValue,
            data_avaliacao: new Date().toISOString()
          })
          .eq('id', exercise.id);

        // 2. Recalculate series with ARA + ART
        const currentSeries = Number(exercise.series);
        const rawSeries = currentSeries + exercise.avaliacao_pump + exercise.avaliacao_fadiga + artValue;
        const newSeries = (rawSeries % 1 > 0.5) ? Math.ceil(rawSeries) : Math.floor(rawSeries);

        if (newSeries !== currentSeries && newSeries >= 1) {
          // Find the workout's week
          const { data: workoutData } = await supabase
            .from('treinos_usuario')
            .select('programa_usuario_id, ordem_semana')
            .eq('id', exercise.treino_usuario_id)
            .single();

          if (workoutData) {
            // Find next week workouts
            const { data: futureWorkouts } = await supabase
              .from('treinos_usuario')
              .select('id, ordem_semana')
              .eq('programa_usuario_id', workoutData.programa_usuario_id)
              .gt('ordem_semana', workoutData.ordem_semana)
              .order('ordem_semana', { ascending: true });

            if (futureWorkouts && futureWorkouts.length > 0) {
              const nextWeek = futureWorkouts[0].ordem_semana;
              const nextWeekIds = futureWorkouts
                .filter(w => w.ordem_semana === nextWeek)
                .map(w => w.id);

              let query = supabase
                .from('exercicios_treino_usuario_avancado')
                .update({ series: newSeries })
                .eq('concluido', false)
                .in('treino_usuario_id', nextWeekIds);

              if (exercise.card_original_id) {
                query = query.eq('card_original_id', exercise.card_original_id);
              } else if (exercise.exercicio_original_id) {
                query = query.eq('exercicio_original_id', exercise.exercicio_original_id);
              } else if (exercise.substituto_custom_id) {
                query = query.eq('substituto_custom_id', exercise.substituto_custom_id);
              }

              await query;
            }
          }
        }
      }

      setShowARTDialog(false);
      setPendingExercises([]);
    } catch (error: any) {
      console.error('Error saving ART feedback:', error);
      throw error;
    }
  };

  return {
    pendingExercises,
    showARTDialog,
    setShowARTDialog,
    saveARTFeedback,
    loading
  };
}
