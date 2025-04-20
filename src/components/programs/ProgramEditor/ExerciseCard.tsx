
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, Grip, X } from "lucide-react";
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
  const [exercises, setExercises] = useState<Array<{ nome: string; grupo_muscular: string }>>([]);

  useEffect(() => {
    const fetchExercises = async () => {
      if (exercise.allowMultipleGroups && exercise.availableGroups) {
        const { data } = await supabase
          .from('exercicios_iniciantes')
          .select('nome, grupo_muscular')
          .in('grupo_muscular', exercise.availableGroups)
          .order('nome');
        setExercises(data || []);
      } else if (exercise.muscleGroup) {
        const { data } = await supabase
          .from('exercicios_iniciantes')
          .select('nome, grupo_muscular')
          .eq('grupo_muscular', exercise.muscleGroup)
          .order('nome');
        setExercises(data || []);
      }
    };

    fetchExercises();
  }, [exercise.muscleGroup, exercise.availableGroups, exercise.allowMultipleGroups]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3">
        <div className="flex justify-between items-center">
          {exercise.allowMultipleGroups ? (
            <Select
              value={exercise.muscleGroup}
              onValueChange={(value) => onExerciseUpdate('muscleGroup', value)}
            >
              <SelectTrigger className="w-32">
                <Badge variant="muscle" className="w-full bg-orange-100 hover:bg-orange-200">
                  {exercise.muscleGroup}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[200px]">
                  {exercise.availableGroups?.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="muscle" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              {exercise.muscleGroup}
            </Badge>
          )}

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
              {exercises.map((ex) => (
                <SelectItem key={`${ex.grupo_muscular}-${ex.nome}`} value={ex.nome}>
                  {ex.nome}
                </SelectItem>
              ))}
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
