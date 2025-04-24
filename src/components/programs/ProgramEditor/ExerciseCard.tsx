
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Eye, Grip, X } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Exercise } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface ExerciseCardProps {
  exercise: Exercise;
  provided: any;
  onDelete: () => void;
  onExerciseUpdate: (field: keyof Exercise, value: string | number) => void;
}

export function ExerciseCard({
  exercise,
  provided,
  onDelete,
  onExerciseUpdate,
}: ExerciseCardProps) {
  const [exercises, setExercises] = useState<Array<{ nome: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchExercises = async () => {
      if (!exercise.muscleGroup) return;
      
      setIsLoading(true);
      console.log(`Fetching exercises for muscle group: ${exercise.muscleGroup}`);
      
      try {
        // Fetch exercises based on the selected muscle group
        const { data, error } = await supabase
          .from('exercicios_iniciantes')
          .select('nome')
          .eq('grupo_muscular', exercise.muscleGroup)
          .order('nome');
        
        if (error) {
          console.error('Error fetching exercises:', error);
          return;
        }
        
        if (data) {
          console.log(`Found ${data.length} exercises for ${exercise.muscleGroup}:`, data);
          setExercises(data);
        }
      } catch (error) {
        console.error('Exception while fetching exercises:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExercises();
  }, [exercise.muscleGroup]);

  // Renderiza a tag normal ou dropdown baseado se tem múltiplos grupos
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
    <Card className="shadow-sm">
      <CardHeader className="p-3">
        <div className="flex justify-between items-center">
          {renderMuscleGroupBadge()}

          <div className="flex gap-1">
            <div {...provided.dragHandleProps} className="cursor-grab p-1">
              <Grip className="h-3 w-3" />
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Eye className="h-3 w-3" />
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

        <Select
          value={exercise.name}
          onValueChange={(value) => onExerciseUpdate('name', value)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecione um exercício" />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[200px]">
              {isLoading ? (
                <SelectItem disabled value="loading">Carregando exercícios...</SelectItem>
              ) : exercises.length > 0 ? (
                exercises.map((ex) => (
                  <SelectItem key={ex.nome} value={ex.nome}>
                    {ex.nome}
                  </SelectItem>
                ))
              ) : (
                <SelectItem disabled value="empty">
                  Nenhum exercício encontrado para {exercise.muscleGroup}
                </SelectItem>
              )}
            </ScrollArea>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-3 pt-0 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Séries</p>
          <Input
            type="number"
            min={1}
            value={exercise.sets}
            onChange={(e) => onExerciseUpdate('sets', Number(e.target.value))}
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Repetições</p>
          <Input
            type="number"
            min={1}
            value={exercise.reps}
            onChange={(e) => onExerciseUpdate('reps', Number(e.target.value))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
