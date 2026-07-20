import { supabase } from "@/integrations/supabase/client";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addWeeks,
  addMonths,
  addYears,
  addDays,
  format,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type Bucket = "week" | "month" | "year";

export function epley1RM(peso: number, reps: number): number {
  if (reps <= 0) return peso;
  return peso * (1 + reps / 30);
}

/** target date for a treino based on programa data_inicio + ordem_semana + ordem_dia */
export function computeTargetDate(
  dataInicio: string | Date,
  ordemSemana: number,
  ordemDia: number
): Date {
  const start = typeof dataInicio === "string" ? new Date(dataInicio) : dataInicio;
  return addDays(start, (ordemSemana - 1) * 7 + (ordemDia - 1));
}

export function bucketLabel(date: Date, bucket: Bucket): string {
  if (bucket === "week") return format(date, "dd/MM", { locale: ptBR });
  if (bucket === "month") return format(date, "MMM/yy", { locale: ptBR });
  return format(date, "yyyy");
}

export function bucketStart(date: Date, bucket: Bucket): Date {
  if (bucket === "week") return startOfWeek(date, { weekStartsOn: 1 });
  if (bucket === "month") return startOfMonth(date);
  return startOfYear(date);
}

export function bucketEnd(date: Date, bucket: Bucket): Date {
  if (bucket === "week") return endOfWeek(date, { weekStartsOn: 1 });
  if (bucket === "month") return endOfMonth(date);
  return endOfYear(date);
}

export function shiftBucket(date: Date, bucket: Bucket, delta: number): Date {
  if (bucket === "week") return addWeeks(date, delta);
  if (bucket === "month") return addMonths(date, delta);
  return addYears(date, delta);
}

export function isInInterval(d: Date, start: Date, end: Date): boolean {
  return isWithinInterval(d, { start, end });
}

/** Canonical key for grouping series across substitutions & levels. */
export function canonicalExerciseKey(row: {
  substituicao_neste_treino?: boolean | null;
  substituto_custom_id?: string | null;
  substituto_oficial_id?: string | null;
  exercicio_original_id?: string | null;
  nome?: string | null;
}): string {
  if (row.substituicao_neste_treino) {
    if (row.substituto_custom_id) return `custom:${row.substituto_custom_id}`;
    if (row.substituto_oficial_id) return `orig:${row.substituto_oficial_id}`;
  }
  if (row.exercicio_original_id) return `orig:${row.exercicio_original_id}`;
  return `name:${(row.nome || "").trim().toLowerCase()}`;
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
