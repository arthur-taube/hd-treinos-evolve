import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { computeTargetDate, getCurrentUserId, isInInterval } from "@/utils/statsQueries";

export interface ConsistencyStats {
  weekDone: number;
  weekTotal: number;
  monthDone: number;
  monthTotal: number;
  loading: boolean;
}

export function useConsistencyData(): ConsistencyStats {
  const [state, setState] = useState<ConsistencyStats>({
    weekDone: 0,
    weekTotal: 0,
    monthDone: 0,
    monthTotal: 0,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (!uid) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      const { data: programs } = await supabase
        .from("programas_usuario")
        .select("id, data_inicio")
        .eq("usuario_id", uid);
      if (!programs || programs.length === 0) {
        setState(s => ({ ...s, loading: false }));
        return;
      }
      const programIds = programs.map(p => p.id);
      const startMap = new Map(programs.map(p => [p.id, p.data_inicio]));

      const { data: treinos } = await supabase
        .from("treinos_usuario")
        .select("id, programa_usuario_id, ordem_semana, ordem_dia, concluido")
        .in("programa_usuario_id", programIds);
      if (!treinos) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      const now = new Date();
      const wStart = startOfWeek(now, { weekStartsOn: 1 });
      const wEnd = endOfWeek(now, { weekStartsOn: 1 });
      const mStart = startOfMonth(now);
      const mEnd = endOfMonth(now);

      let weekTotal = 0, weekDone = 0, monthTotal = 0, monthDone = 0;
      for (const t of treinos) {
        const di = startMap.get(t.programa_usuario_id);
        if (!di) continue;
        const target = computeTargetDate(di, t.ordem_semana, t.ordem_dia ?? 1);
        if (isInInterval(target, wStart, wEnd)) {
          weekTotal++;
          if (t.concluido) weekDone++;
        }
        if (isInInterval(target, mStart, mEnd)) {
          monthTotal++;
          if (t.concluido) monthDone++;
        }
      }

      setState({ weekDone, weekTotal, monthDone, monthTotal, loading: false });
    })();
  }, []);

  return state;
}
