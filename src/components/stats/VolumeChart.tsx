import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { addWeeks, endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVolumeData, DEFAULT_MUSCLE_GROUPS } from "@/hooks/useVolumeData";
import VolumeGroupsDialog from "./VolumeGroupsDialog";

const VolumeChart = () => {
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const { bars, muscles, loading, allMusclesUniverse, preferredGroups, saveGroups } = useVolumeData(anchor);

  const wStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const wEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const label = `${format(wStart, "dd/MM", { locale: ptBR })} – ${format(wEnd, "dd/MM", { locale: ptBR })}`;

  const selected = (preferredGroups && preferredGroups.length > 0 ? preferredGroups : DEFAULT_MUSCLE_GROUPS);

  return (
    <Card className="program-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Volume semanal</CardTitle>
          <Button size="icon" variant="ghost" onClick={() => setDialogOpen(true)}>
            <Settings size={16} />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button size="icon" variant="ghost" onClick={() => setAnchor(a => addWeeks(a, -1))}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm text-muted-foreground">{label}</span>
          <Button size="icon" variant="ghost" onClick={() => setAnchor(a => addWeeks(a, 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 animate-pulse bg-muted/20 rounded" />
        ) : bars.length === 0 || bars.every(b => b.previsto === 0 && b.realizado === 0) ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados nesta semana.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, bars.length * 42)}>
            <BarChart data={bars} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                type="category"
                dataKey="muscle"
                width={110}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="previsto" name="Previsto" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
      <VolumeGroupsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allMuscles={allMusclesUniverse}
        selected={selected}
        onSave={saveGroups}
      />
    </Card>
  );
};

export default VolumeChart;
