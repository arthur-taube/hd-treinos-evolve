import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePRData } from "@/hooks/usePRData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <div className="font-medium">{format(new Date(p.timestamp), "dd/MM/yyyy", { locale: ptBR })}</div>
      <div className="text-muted-foreground mt-1">
        1RMe: {p.reps} reps × {p.peso}kg ={" "}
        <span className="text-foreground font-semibold">{p.best1RM.toFixed(2)}kg</span>
      </div>
    </div>
  );
};

const PRSection = () => {
  const { options, seriesByKey, loading } = usePRData();
  const [selected, setSelected] = useState<string | null>(null);

  const activeKey = selected ?? options[0]?.key ?? null;
  const data = useMemo(() => (activeKey ? seriesByKey.get(activeKey) ?? [] : []), [activeKey, seriesByKey]);

  return (
    <Card className="program-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Recordes pessoais</CardTitle>
          <Select value={activeKey ?? undefined} onValueChange={setSelected}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Escolha um exercício" />
            </SelectTrigger>
            <SelectContent>
              {options.map(o => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-52 animate-pulse bg-muted/20 rounded" />
        ) : options.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Complete séries em treinos para ver seus recordes.
          </p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados para este exercício.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={t => format(new Date(t), "dd/MM", { locale: ptBR })}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                domain={["auto", "auto"]}
                tickFormatter={v => `${v}kg`}
              />
              <Tooltip content={<PRTooltip />} />
              <Line
                type="monotone"
                dataKey="best1RM"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default PRSection;
