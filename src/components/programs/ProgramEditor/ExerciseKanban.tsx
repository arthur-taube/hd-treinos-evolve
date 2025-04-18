
import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExerciseKanbanProps {
  weeklyFrequency: number;
  daysSchedule: string[][];
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  muscleGroup: string;
}

export default function ExerciseKanban({ 
  weeklyFrequency, 
  daysSchedule 
}: ExerciseKanbanProps) {
  // For demo purposes, we'll use just the first schedule if available
  const schedule = daysSchedule.length > 0 ? daysSchedule[0] : Array(weeklyFrequency).fill("");
  
  const [exercises, setExercises] = useState<Record<string, Exercise[]>>(() => {
    // Initialize with empty arrays for each day
    const initialExercises: Record<string, Exercise[]> = {};
    schedule.forEach((day) => {
      initialExercises[day] = [];
    });
    return initialExercises;
  });

  const addExercise = (day: string) => {
    const newExercise: Exercise = {
      id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "Novo Exercício",
      sets: 3,
      reps: 12,
      muscleGroup: "Peito"
    };

    setExercises({
      ...exercises,
      [day]: [...(exercises[day] || []), newExercise]
    });
  };

  const getDayLabel = (dayId: string) => {
    const dayMap: Record<string, string> = {
      "segunda": "Segunda",
      "terca": "Terça",
      "quarta": "Quarta",
      "quinta": "Quinta",
      "sexta": "Sexta",
      "sabado": "Sábado",
      "domingo": "Domingo"
    };
    return dayMap[dayId] || dayId;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Montagem do Treino</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {schedule.map((day, index) => (
          <div key={index} className="flex flex-col">
            <div className="bg-muted p-2 rounded-t-md">
              <h4 className="font-medium text-center">
                {getDayLabel(day)}
              </h4>
            </div>
            
            <div className="bg-muted/50 rounded-b-md p-2 flex-1 min-h-[300px] flex flex-col">
              <Button
                variant="ghost"
                className="flex w-full justify-center p-2 mb-2"
                onClick={() => addExercise(day)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Exercício
              </Button>

              <div className="space-y-2">
                {exercises[day]?.map((exercise) => (
                  <Card key={exercise.id} className="shadow-sm">
                    <CardHeader className="p-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">
                          {exercise.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {exercise.muscleGroup}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-muted-foreground">
                        {exercise.sets} séries x {exercise.reps} repetições
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {schedule.length === 0 && (
        <div className="text-center p-4 border border-dashed rounded-md">
          <p className="text-muted-foreground">
            Defina pelo menos um cronograma de treino para visualizar o quadro Kanban
          </p>
        </div>
      )}
    </div>
  );
}
