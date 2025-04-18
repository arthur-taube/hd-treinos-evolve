
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
}

const StatCard = ({ title, value, icon }: StatCardProps) => {
  return (
    <Card className="program-card">
      <CardContent className="p-4 flex justify-between items-center">
        <div>
          <h3 className="text-sm text-muted-foreground">{title}</h3>
          <p className="text-2xl font-bold font-display text-foreground">
            {value}
          </p>
        </div>
        {icon && (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
