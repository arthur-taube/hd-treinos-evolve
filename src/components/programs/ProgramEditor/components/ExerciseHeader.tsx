
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, Eye, EyeOff, Grip, X } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Exercise } from "../types";

interface ExerciseHeaderProps {
  exercise: Exercise;
  dragHandleProps: any;
  onDelete: () => void;
  onExerciseUpdate: (field: keyof Exercise, value: string | number | boolean) => void;
}

export function ExerciseHeader({
  exercise,
  dragHandleProps,
  onDelete,
  onExerciseUpdate,
}: ExerciseHeaderProps) {
  const toggleVisibility = () => {
    onExerciseUpdate('hidden', !exercise.hidden);
  };

  const renderMuscleGroupBadge = () => {
    if (exercise.allowMultipleGroups && exercise.availableGroups && exercise.availableGroups.length > 0) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="cursor-pointer">
              <Badge variant="multi" className="flex items-center gap-1">
                {exercise.muscleGroup}
                <ChevronDown className="h-3 w-3" />
              </Badge>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {exercise.availableGroups.map((group) => (
              <DropdownMenuItem 
                key={group}
                onClick={() => onExerciseUpdate('muscleGroup', group)}
              >
                {group}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    
    return (
      <Badge variant="muscle">
        {exercise.muscleGroup}
      </Badge>
    );
  };

  return (
    <div className="flex justify-between items-center">
      {renderMuscleGroupBadge()}

      <div className="flex gap-1">
        <div {...dragHandleProps} className="cursor-grab p-1">
          <Grip className="h-3 w-3" />
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={toggleVisibility}
        >
          {exercise.hidden ? 
            <EyeOff className="h-3 w-3" /> : 
            <Eye className="h-3 w-3" />
          }
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-destructive hover:text-destructive/80"
          onClick={onDelete}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
