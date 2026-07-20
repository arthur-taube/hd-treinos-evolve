import { Card, CardContent } from "@/components/ui/card";
import { useConsistencyData } from "@/hooks/useConsistencyData";
import { CalendarCheck, CalendarRange } from "lucide-react";

function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

const Item = ({
  title,
  done,
  total,
  icon,
}: {
  title: string;
  done: number;
  total: number;
  icon: React.ReactNode;
}) => (
  <Card className="program-card">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <h3 className="text-sm text-muted-foreground">{title}</h3>
        <p className="text-2xl font-bold font-display text-foreground">
          {done}/{total} <span className="text-base text-muted-foreground">({pct(done, total)}%)</span>
        </p>
      </div>
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
    </CardContent>
  </Card>
);

const ConsistencyCards = () => {
  const { weekDone, weekTotal, monthDone, monthTotal, loading } = useConsistencyData();
  if (loading) {
    return <div className="grid grid-cols-2 gap-3 h-24 animate-pulse" />;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <Item title="Na semana" done={weekDone} total={weekTotal} icon={<CalendarCheck size={18} />} />
      <Item title="No mês" done={monthDone} total={monthTotal} icon={<CalendarRange size={18} />} />
    </div>
  );
};

export default ConsistencyCards;
