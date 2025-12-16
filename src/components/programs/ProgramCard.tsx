
import { Card } from "@/components/ui/card";
import ProgramOptionsMenu from "./ProgramOptionsMenu";

interface ProgramCardProps {
  name: string;
  description?: string;
  isPaused?: boolean;
  hasUnfinishedWorkouts?: boolean;
  onResume?: () => void;
  onPause?: () => void;
  onEdit?: () => void;
  onFinish?: () => void;
  onDelete?: () => void;
}

const ProgramCard = ({
  name,
  description,
  isPaused = false,
  hasUnfinishedWorkouts = true,
  onResume,
  onPause,
  onEdit,
  onFinish,
  onDelete,
}: ProgramCardProps) => {
  return (
    <Card className="flex justify-between items-center p-4 program-card">
      <div>
        <h3 className="font-medium">{name}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <ProgramOptionsMenu 
        isPaused={isPaused}
        hasUnfinishedWorkouts={hasUnfinishedWorkouts}
        onResume={onResume}
        onPause={onPause}
        onEdit={onEdit}
        onFinish={onFinish}
        onDelete={onDelete}
      />
    </Card>
  );
};

export default ProgramCard;
