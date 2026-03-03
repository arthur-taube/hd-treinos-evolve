
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play } from "lucide-react";

interface ProgramCardProps {
  title: string;
  subtitle?: string;
  progress?: number;
  onClick?: () => void;
  showPlayButton?: boolean;
}

const ProgramCard = ({
  title,
  subtitle,
  progress,
  onClick,
  showPlayButton = false,
}: ProgramCardProps) => {
  return (
    <Card 
      className="program-card cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </CardContent>
        </div>
        {showPlayButton && (
          <Button
            className="rounded-full p-2 h-10 w-10 bg-primary hover:bg-blue-600"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Play className="h-5 w-5" />
          </Button>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <span className="text-sm">Progresso</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </Card>
  );
};

export default ProgramCard;
