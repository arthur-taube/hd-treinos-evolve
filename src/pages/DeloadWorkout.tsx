import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast as sonnerToast } from "sonner";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  buildBaselineSets,
  computeDeloadSeriesCount,
  computeDeloadExerciseSets,
  DeloadMode,
  DeloadOriginExercise,
  loadOriginExercises,
} from "@/utils/deload";
import { Loader2, Snowflake } from "lucide-react";

interface DeloadDia {
  id: string;
  deload_semana_id: string;
  ordem_dia: number;
  nome: string;
  metade: "primeira" | "segunda";
  treino_origem_id: string | null;
  concluido: boolean;
}

interface DeloadSerieRow {
  id?: string;
  exercicio_nome: string;
  grupo_muscular: string | null;
  ordem: number;
  modo: DeloadMode;
  numero_serie: number;
  peso: number | null;
  repeticoes: number | null;
  concluida: boolean;
}

interface ExerciseState {
  origin: DeloadOriginExercise;
  mode: DeloadMode;
  sets: DeloadSerieRow[];
}

export default function DeloadWorkout() {
  const navigate = useNavigate();
  const { deloadDiaId } = useParams<{ deloadDiaId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dia, setDia] = useState<DeloadDia | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [programaUsuarioId, setProgramaUsuarioId] = useState<string | null>(
    null
  );
  const [exercises, setExercises] = useState<ExerciseState[]>([]);

  const isCombinadoFixed = dia?.metade === "segunda";

  useEffect(() => {
    if (!deloadDiaId) return;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          navigate("/auth");
          return;
        }
        setUserId(userData.user.id);

        const { data: diaData, error: diaErr } = await supabase
          .from("deload_dias" as any)
          .select("*, deload_semanas!inner(programa_usuario_id)")
          .eq("id", deloadDiaId)
          .single();
        if (diaErr || !diaData) throw diaErr;

        const diaRow = diaData as any;
        setDia({
          id: diaRow.id,
          deload_semana_id: diaRow.deload_semana_id,
          ordem_dia: diaRow.ordem_dia,
          nome: diaRow.nome,
          metade: diaRow.metade,
          treino_origem_id: diaRow.treino_origem_id,
          concluido: diaRow.concluido,
        });
        setProgramaUsuarioId(diaRow.deload_semanas.programa_usuario_id);

        // Existing deload_series (if user returned to the page)
        const { data: existingSeries } = await supabase
          .from("deload_series" as any)
          .select("*")
          .eq("deload_dia_id", deloadDiaId);

        const originExercises = diaRow.treino_origem_id
          ? await loadOriginExercises(diaRow.treino_origem_id)
          : [];

        const defaultMode: DeloadMode =
          diaRow.metade === "segunda" ? "combinado" : "volume";

        // Determine mode from existing series if present.
        const existingByOrdem: Record<
          number,
          { mode: DeloadMode; rows: any[] }
        > = {};
        for (const s of (existingSeries as any[]) || []) {
          if (!existingByOrdem[s.ordem]) {
            existingByOrdem[s.ordem] = { mode: s.modo, rows: [] };
          }
          existingByOrdem[s.ordem].rows.push(s);
        }

        const built: ExerciseState[] = originExercises.map((ex) => {
          const existing = existingByOrdem[ex.ordem];
          const mode: DeloadMode = existing?.mode ?? defaultMode;
          const setsCount = computeDeloadSeriesCount(ex.series, mode);
          if (existing && existing.rows.length > 0) {
            const rows = existing.rows
              .sort((a: any, b: any) => a.numero_serie - b.numero_serie)
              .map((r: any) => ({
                id: r.id,
                exercicio_nome: r.exercicio_nome,
                grupo_muscular: r.grupo_muscular,
                ordem: r.ordem,
                modo: r.modo as DeloadMode,
                numero_serie: r.numero_serie,
                peso: r.peso,
                repeticoes: r.repeticoes,
                concluida: r.concluida,
              })) as DeloadSerieRow[];
            return { origin: ex, mode, sets: rows };
          }

          const baseline = buildBaselineSets(ex.sets, setsCount);
          const sets: DeloadSerieRow[] = baseline.map((b) => {
            const computed = computeDeloadSet(b, mode, ex.incremento_minimo);
            return {
              exercicio_nome: ex.nome,
              grupo_muscular: ex.grupo_muscular,
              ordem: ex.ordem,
              modo: mode,
              numero_serie: b.numero_serie,
              peso: computed.peso,
              repeticoes: computed.repeticoes,
              concluida: false,
            };
          });
          return { origin: ex, mode, sets };
        });

        setExercises(built);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Erro ao carregar deload",
          description: e?.message || "Não foi possível carregar este dia.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [deloadDiaId, navigate]);

  const recomputeSetsForMode = (ex: ExerciseState, newMode: DeloadMode): DeloadSerieRow[] => {
    const setsCount = computeDeloadSeriesCount(ex.origin.series, newMode);
    const baseline = buildBaselineSets(ex.origin.sets, setsCount);
    return baseline.map((b) => {
      const computed = computeDeloadSet(b, newMode, ex.origin.incremento_minimo);
      return {
        exercicio_nome: ex.origin.nome,
        grupo_muscular: ex.origin.grupo_muscular,
        ordem: ex.origin.ordem,
        modo: newMode,
        numero_serie: b.numero_serie,
        peso: computed.peso,
        repeticoes: computed.repeticoes,
        concluida: false,
      };
    });
  };

  const handleModeChange = (index: number, mode: DeloadMode) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, mode, sets: recomputeSetsForMode(ex, mode) } : ex))
    );
  };

  const handleSetChange = (
    exIndex: number,
    setIndex: number,
    field: "peso" | "repeticoes" | "concluida",
    value: any
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIndex) return ex;
        const sets = ex.sets.map((s, j) => (j === setIndex ? { ...s, [field]: value } : s));
        return { ...ex, sets };
      })
    );
  };

  const allCompleted = useMemo(() => {
    if (exercises.length === 0) return false;
    return exercises.every((ex) => ex.sets.every((s) => s.concluida));
  }, [exercises]);

  const handleSaveAndFinish = async () => {
    if (!dia || !userId) return;
    setSaving(true);
    try {
      // Wipe existing rows for this deload_dia and re-insert (simple and correct).
      await supabase.from("deload_series" as any).delete().eq("deload_dia_id", dia.id);

      const rows = exercises.flatMap((ex) =>
        ex.sets.map((s) => ({
          deload_dia_id: dia.id,
          user_id: userId,
          exercicio_nome: ex.origin.nome,
          grupo_muscular: ex.origin.grupo_muscular,
          ordem: ex.origin.ordem,
          modo: ex.mode,
          numero_serie: s.numero_serie,
          peso: s.peso,
          repeticoes: s.repeticoes,
          concluida: s.concluida,
        }))
      );

      if (rows.length > 0) {
        const { error: insertErr } = await supabase
          .from("deload_series" as any)
          .insert(rows);
        if (insertErr) throw insertErr;
      }

      if (allCompleted) {
        await supabase
          .from("deload_dias" as any)
          .update({
            concluido: true,
            data_concluido: new Date().toISOString(),
          })
          .eq("id", dia.id);

        // Check if all dias of this deload_semana are done.
        const { data: remaining } = await supabase
          .from("deload_dias" as any)
          .select("id")
          .eq("deload_semana_id", dia.deload_semana_id)
          .eq("concluido", false);

        if ((remaining?.length ?? 0) === 0) {
          await supabase
            .from("deload_semanas" as any)
            .update({
              concluido: true,
              data_concluido: new Date().toISOString(),
            })
            .eq("id", dia.deload_semana_id);
        }

        sonnerToast.success("Dia de deload concluído!");
      } else {
        sonnerToast.success("Progresso salvo");
      }

      navigate("/active-program");
    } catch (e: any) {
      console.error(e);
      sonnerToast.error(e?.message || "Erro ao salvar deload");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!dia) {
    return (
      <div className="p-6">
        <p>Deload não encontrado.</p>
        <Button onClick={() => navigate("/active-program")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title={`Deload · ${dia.nome}`}>
        <Button variant="outline" onClick={() => navigate("/active-program")}>
          Voltar
        </Button>
      </PageHeader>

      <div className="max-w-2xl mx-auto space-y-4 mt-4">
        <div className="p-4 rounded-lg bg-sky-950/40 border border-sky-500/30 flex items-start gap-3">
          <Snowflake className="h-5 w-5 text-sky-300 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-sky-200">
              {dia.metade === "primeira"
                ? "Primeira metade da semana — escolha Volume ou Carga por exercício"
                : "Segunda metade da semana — deload combinado (volume + carga)"}
            </p>
            <p className="text-sky-100/80 mt-1">
              Os dados desta semana não afetam suas séries de treino normais.
            </p>
          </div>
        </div>

        {exercises.length === 0 && (
          <Card className="p-4 text-center text-muted-foreground">
            Não há exercícios de origem para este dia.
          </Card>
        )}

        {exercises.map((ex, exIndex) => (
          <Card key={ex.origin.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h3 className="font-semibold">{ex.origin.nome}</h3>
                {ex.origin.grupo_muscular && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {ex.origin.grupo_muscular}
                  </Badge>
                )}
              </div>
              {!isCombinadoFixed ? (
                <div className="w-40">
                  <Label className="text-xs text-muted-foreground">Modo</Label>
                  <Select
                    value={ex.mode}
                    onValueChange={(v) => handleModeChange(exIndex, v as DeloadMode)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume">Volume</SelectItem>
                      <SelectItem value="carga">Carga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Badge className="bg-sky-600 hover:bg-sky-600">Combinado</Badge>
              )}
            </div>

            <div className="space-y-2">
              {ex.sets.map((s, setIndex) => (
                <div
                  key={s.numero_serie}
                  className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center"
                >
                  <span className="text-sm font-medium text-muted-foreground w-8">
                    #{s.numero_serie}
                  </span>
                  <div>
                    <Label className="text-xs text-muted-foreground">Kg</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={s.peso ?? ""}
                      onChange={(e) =>
                        handleSetChange(
                          exIndex,
                          setIndex,
                          "peso",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Reps</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={s.repeticoes ?? ""}
                      onChange={(e) =>
                        handleSetChange(
                          exIndex,
                          setIndex,
                          "repeticoes",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-center pt-4">
                    <Checkbox
                      checked={s.concluida}
                      onCheckedChange={(v) =>
                        handleSetChange(exIndex, setIndex, "concluida", !!v)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        <div className="sticky bottom-4">
          <Button
            className="w-full"
            disabled={saving || exercises.length === 0}
            onClick={handleSaveAndFinish}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {allCompleted ? "Finalizar dia de deload" : "Salvar progresso"}
          </Button>
        </div>
      </div>
    </div>
  );
}
