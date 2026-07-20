import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Bucket,
  bucketEnd,
  bucketLabel,
  bucketStart,
  getCurrentUserId,
  shiftBucket,
} from "@/utils/statsQueries";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const BUCKETS = 12;

const WorkoutsChart = () => {
  const [bucket, setBucket] = useState<Bucket>("month");
  const [dates, setDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const uid = await getCurrentUserId();
      if (!uid) {
        setDates([]);
        setLoading(false);
        return;
      }
      const { data: programs } = await supabase
        .from("programas_usuario")
        .select("id")
        .eq("usuario_id", uid);
      const ids = programs?.map(p => p.id) ?? [];
      if (ids.length === 0) {
        setDates([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("treinos_usuario")
        .select("data_concluido")
        .in("programa_usuario_id", ids)
        .eq("concluido", true)
        .not("data_concluido", "is", null);
      setDates((data ?? []).map(r => new Date(r.data_concluido as string)));
      setLoading(false);
    })();
  }, []);

  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; count: number; start: Date; end: Date }[] = [];
    for (let i = BUCKETS - 1; i >= 0; i--) {
      const anchor = shiftBucket(now, bucket, -i);
      const s = bucketStart(anchor, bucket);
      const e = bucketEnd(anchor, bucket);
      buckets.push({ label: bucketLabel(s, bucket), count: 0, start: s, end: e });
    }
    for (const d of dates) {
      for (const b of buckets) {
        if (d >= b.start && d <= b.end) {
          b.count++;
          break;
        }
      }
    }
    return buckets.map(b => ({ label: b.label, count: b.count }));
  }, [dates, bucket]);

  return (
    <Card className="program-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Treinos realizados</CardTitle>
        <ToggleGroup
          type="single"
          value={bucket}
          onValueChange={v => v && setBucket(v as Bucket)}
          size="sm"
        >
          <ToggleGroupItem value="week">Semana</ToggleGroupItem>
          <ToggleGroupItem value="month">Mês</ToggleGroupItem>
          <ToggleGroupItem value="year">Ano</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-52 animate-pulse bg-muted/20 rounded" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkoutsChart;
