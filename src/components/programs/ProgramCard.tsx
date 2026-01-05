
import { Card } from "@/components/ui/card";
import ProgramOptionsMenu from "./ProgramOptionsMenu";

interface ProgramCardProps {
  name: string;
  description?: string;
  isPaused?: boolean;
  isFinished?: boolean;
  hasUnfinishedWorkouts?: boolean;
  onOpen?: () => void;
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
  isFinished = false,
  hasUnfinishedWorkouts = true,
  onOpen,
  onResume,
  onPause,
  onEdit,
  onFinish,
  onDelete,
}: ProgramCardProps) => {
  return (
    <Card className="flex justify-between items-center p-4 program-card">
      <div 
        onClick={onOpen} 
        className={onOpen ? "flex-1 cursor-pointer" : "flex-1"}
      >
        <h3 className="font-medium">{name}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <ProgramOptionsMenu 
        isPaused={isPaused}
        isFinished={isFinished}
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
