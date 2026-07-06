import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeStarProgression } from "@/utils/starProgression";

export interface StarProgressionHookResult {
  suggestedWeight: number;
  suggestedReps: number;
  base: { weight: number; reps: number };
  fromDeloadBase: boolean;
}

/**
 * STAR progression hook for intermediate programs.
 * - Normally suggests the smallest positive Epley increase over the previous week's first set.
 * - When the previous instance was a deload week, it REPEATS the stored suggested progression
 *   (progressao_base_peso / progressao_base_reps) so the return week stays on the intended
 *   trajectory instead of progressing from the reduced deload numbers.
 */
export function useStarProgression(
  exerciseId: string,
  exercicioOriginalId: string | null,
  cardOriginalId: string | null,
  substitutoCustomId: string | null,
  treinoUsuarioId: string,
  repeticoes: string | null,
  incrementoMinimo: number | null
): StarProgressionHookResult | null {
  const [result, setResult] = useState<StarProgressionHookResult | null>(null);

  useEffect(() => {
    if (!exerciseId || !treinoUsuarioId) return;
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, treinoUsuarioId]);

  const calculate = async () => {
    try {
      const { data: currentWorkout } = await supabase
        .from("treinos_usuario")
        .select("programa_usuario_id")
        .eq("id", treinoUsuarioId)
        .single();

      if (!currentWorkout) {
        setResult(null);
        return;
      }

      // Find most recent completed instance of this exercise in the same program
      let prevQuery = supabase
        .from("exercicios_treino_usuario_avancado")
        .select(
          `id, deload, progressao_base_peso, progressao_base_reps,
           treino_usuario_id, treinos_usuario!inner(programa_usuario_id)`
        )
        .eq("concluido", true)
        .eq("treinos_usuario.programa_usuario_id", currentWorkout.programa_usuario_id)
        .neq("treino_usuario_id", treinoUsuarioId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (cardOriginalId) {
        prevQuery = prevQuery.eq("card_original_id", cardOriginalId);
      } else if (exercicioOriginalId) {
        prevQuery = prevQuery.eq("exercicio_original_id", exercicioOriginalId);
      } else if (substitutoCustomId) {
        prevQuery = prevQuery.eq("substituto_custom_id", substitutoCustomId);
      }

      const { data: prevExercises } = await prevQuery;
      if (!prevExercises || prevExercises.length === 0) {
        setResult(null);
        return;
      }

      const prev = prevExercises[0] as any;

      // Return week after a deload: repeat the stored base progression.
      if (prev.deload && prev.progressao_base_peso != null && prev.progressao_base_reps != null) {
        setResult({
          suggestedWeight: Number(prev.progressao_base_peso),
          suggestedReps: Number(prev.progressao_base_reps),
          base: { weight: Number(prev.progressao_base_peso), reps: Number(prev.progressao_base_reps) },
          fromDeloadBase: true,
        });
        return;
      }

      // Normal progression from previous first set
      const { data: seriesData } = await supabase.rpc("get_series_by_exercise", {
        exercise_id: prev.id,
      });

      if (!seriesData || seriesData.length === 0) {
        setResult(null);
        return;
      }

      const firstSet = seriesData.sort((a, b) => a.numero_serie - b.numero_serie)[0];
      const prevWeight = firstSet.peso;
      const prevReps = firstSet.repeticoes;

      if (prevWeight <= 0 && prevReps <= 0) {
        setResult(null);
        return;
      }

      const progression = computeStarProgression(
        prevWeight,
        prevReps,
        incrementoMinimo || 2.5,
        repeticoes
      );

      if (!progression) {
        // No positive increase possible → keep previous
        setResult({
          suggestedWeight: prevWeight,
          suggestedReps: prevReps,
          base: { weight: prevWeight, reps: prevReps },
          fromDeloadBase: false,
        });
        return;
      }

      setResult({
        suggestedWeight: progression.weight,
        suggestedReps: progression.reps,
        base: { weight: prevWeight, reps: prevReps },
        fromDeloadBase: false,
      });
    } catch (error) {
      console.error("Error calculating STAR progression:", error);
      setResult(null);
    }
  };

  return result;
}
