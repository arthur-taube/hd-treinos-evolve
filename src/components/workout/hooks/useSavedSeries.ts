import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SavedSet {
  number: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
  note: string;
}

/**
 * Fetches the actual saved series for a specific exercise instance from
 * `series_exercicio_usuario` (by `exercicio_usuario_id`). Used only in
 * view mode (revisiting paused/finished programs) to show real data the
 * user performed for that day — never progression suggestions.
 */
export function useSavedSeries(enabled: boolean, exerciseId: string) {
  const [savedSets, setSavedSets] = useState<SavedSet[] | null>(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  useEffect(() => {
    if (!enabled || !exerciseId) return;

    let cancelled = false;

    const fetchSavedSeries = async () => {
      setIsLoadingSaved(true);
      try {
        const { data, error } = await supabase
          .from('series_exercicio_usuario')
          .select('numero_serie, peso, repeticoes, nota')
          .eq('exercicio_usuario_id', exerciseId)
          .order('numero_serie', { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const mapped: SavedSet[] = (data || []).map((s, idx) => ({
          number: idx + 1,
          weight: s.peso ?? null,
          reps: s.repeticoes ?? null,
          completed: true,
          note: s.nota || '',
        }));

        setSavedSets(mapped);
      } catch (err) {
        console.error("Error fetching saved series:", err);
        if (!cancelled) setSavedSets([]);
      } finally {
        if (!cancelled) setIsLoadingSaved(false);
      }
    };

    fetchSavedSeries();
    return () => { cancelled = true; };
  }, [enabled, exerciseId]);

  return { savedSets, isLoadingSaved };
}
