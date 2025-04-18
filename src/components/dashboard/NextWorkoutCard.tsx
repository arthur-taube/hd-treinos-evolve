
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface NextWorkoutCardProps {
  programName?: string;
  workoutDay?: string;
  date?: string;
  weekday?: string;
  onStart?: () => void;
}

const NextWorkoutCard = ({
  programName = "Sem programa ativo",
  workoutDay = "",
  date = "",
  weekday = "",
  onStart,
}: NextWorkoutCardProps) => {
  const hasActiveProgram = programName !== "Sem programa ativo";

  return (
    <Card className="program-card">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Próximo Treino</h3>
          {hasActiveProgram && (
            <Button
              className="rounded-full p-2 h-10 w-10 bg-primary hover:bg-blue-600"
              onClick={onStart}
            >
              <Play className="h-5 w-5" />
            </Button>
          )}
        </div>

        {hasActiveProgram ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{programName}</p>
            {workoutDay && <p className="text-sm">{workoutDay}</p>}
            {date && weekday && (
              <p className="text-sm text-muted-foreground">
                {date}, {weekday}
              </p>
            )}
          </div>
        ) : (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Você ainda não registrou nenhum treino
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NextWorkoutCard;
