import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canonicalExerciseKey, epley1RM, getCurrentUserId } from "@/utils/statsQueries";

export interface PRExerciseOption {
  key: string;
  label: string;
}

export interface PRPoint {
  date: string; // yyyy-mm-dd
  timestamp: number;
  best1RM: number;
  peso: number;
  reps: number;
}

interface SeriesRow {
  peso: number;
  repeticoes: number;
  concluida: boolean;
  updated_at: string;
  created_at: string;
  exercicio_usuario_id: string;
}

interface ExerciseRow {
  id: string;
  nome: string | null;
  exercicio_original_id: string | null;
  substituicao_neste_treino: boolean | null;
  substituto_oficial_id: string | null;
  substituto_custom_id: string | null;
}

export function usePRData() {
  const [options, setOptions] = useState<PRExerciseOption[]>([]);
  const [seriesByKey, setSeriesByKey] = useState<Map<string, PRPoint[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data: series } = await supabase
        .from("series_exercicio_usuario")
        .select("peso, repeticoes, concluida, updated_at, created_at, exercicio_usuario_id")
        .eq("user_id", uid)
        .eq("concluida", true);
      if (!series || series.length === 0) {
        setLoading(false);
        return;
      }

      const exerciseIds = Array.from(new Set(series.map(s => s.exercicio_usuario_id)));

      const [{ data: begList }, { data: advList }] = await Promise.all([
        supabase
          .from("exercicios_treino_usuario")
          .select("id, nome, exercicio_original_id, substituicao_neste_treino, substituto_oficial_id, substituto_custom_id")
          .in("id", exerciseIds),
        supabase
          .from("exercicios_treino_usuario_avancado")
          .select("id, nome, exercicio_original_id, substituicao_neste_treino, substituto_oficial_id, substituto_custom_id")
          .in("id", exerciseIds),
      ]);

      const exerciseMap = new Map<string, ExerciseRow>();
      for (const r of (begList ?? []) as ExerciseRow[]) exerciseMap.set(r.id, r);
      for (const r of (advList ?? []) as ExerciseRow[]) exerciseMap.set(r.id, r);

      // group by canonical key
      const grouped = new Map<string, { label: string; points: Map<string, PRPoint> }>();
      for (const s of series as SeriesRow[]) {
        const ex = exerciseMap.get(s.exercicio_usuario_id);
        if (!ex) continue;
        const key = canonicalExerciseKey(ex);
        const label = ex.nome || "Exercício";
        const est = epley1RM(s.peso, s.repeticoes);
        const dateStr = (s.updated_at || s.created_at).slice(0, 10);
        if (!grouped.has(key)) grouped.set(key, { label, points: new Map() });
        const group = grouped.get(key)!;
        const existing = group.points.get(dateStr);
        if (!existing || est > existing.best1RM) {
          group.points.set(dateStr, {
            date: dateStr,
            timestamp: new Date(dateStr).getTime(),
            best1RM: Math.round(est * 100) / 100,
            peso: s.peso,
            reps: s.repeticoes,
          });
        }
      }

      const opts: PRExerciseOption[] = [];
      const map = new Map<string, PRPoint[]>();
      for (const [key, val] of grouped) {
        opts.push({ key, label: val.label });
        map.set(key, Array.from(val.points.values()).sort((a, b) => a.timestamp - b.timestamp));
      }
      opts.sort((a, b) => a.label.localeCompare(b.label));

      setOptions(opts);
      setSeriesByKey(map);
      setLoading(false);
    })();
  }, []);

  return { options, seriesByKey, loading };
}
