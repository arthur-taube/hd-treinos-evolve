
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Exercise } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseHeader } from "./components/ExerciseHeader";
import { ExerciseNameSelect } from "./components/ExerciseNameSelect";
import { ExerciseDetails } from "./components/ExerciseDetails";
import { Database } from "@/integrations/supabase/types";
import { RepsRange } from "./types";

// Module-level cache for reps ranges
let repsRangesCache: RepsRange[] | null = null;
let repsRangesFetchPromise: Promise<RepsRange[]> | null = null;

interface ExerciseCardProps {
  exercise: Exercise;
  provided: any;
  onDelete: () => void;
  onExerciseUpdate: (field: keyof Exercise, value: string | number | boolean) => void;
  mode?: 'edit' | 'customize';
}

export function ExerciseCard({
  exercise,
  provided,
  onDelete,
  onExerciseUpdate,
  mode = 'edit',
}: ExerciseCardProps) {
  const [exercises, setExercises] = useState<Array<{ nome: string }>>([]);
  const [repsRanges, setRepsRanges] = useState<RepsRange[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRepsRanges = async (): Promise<RepsRange[]> => {
      const { data, error } = await supabase
        .from('faixas_repeticoes')
        .select('*')
        .order('min_reps');
      
      if (error) {
        console.error('Error fetching reps ranges:', error);
        return [];
      }

      if (data) {
        // Convert Supabase data to our RepsRange type
        const typedRanges: RepsRange[] = data.map(range => ({
          id: range.id,
          min_reps: range.min_reps,
          max_reps: range.max_reps,
          tipo: range.tipo
        }));
        return typedRanges;
      }
      
      return [];
    };

    const loadRepsRanges = async () => {
      // Use cache if available
      if (repsRangesCache) {
        setRepsRanges(repsRangesCache);
        return;
      }

      // Use existing promise if one is in flight
      if (repsRangesFetchPromise) {
        const ranges = await repsRangesFetchPromise;
        setRepsRanges(ranges);
        return;
      }

      // Create new fetch promise
      repsRangesFetchPromise = fetchRepsRanges();
      const ranges = await repsRangesFetchPromise;
      
      // Cache the result
      repsRangesCache = ranges;
      repsRangesFetchPromise = null;
      
      setRepsRanges(ranges);
    };

    loadRepsRanges();
  }, []);

  useEffect(() => {
    const fetchExercises = async () => {
      if (!exercise.muscleGroup) return;
      
      setIsLoading(true);
      console.log(`Fetching exercises for muscle group: ${exercise.muscleGroup}`);
      
      try {
        // Use overlaps instead of eq to match any exercise that contains the selected muscle group
        const { data, error } = await supabase
          .from('exercicios_iniciantes')
          .select('nome')
          .overlaps('grupo_muscular', [exercise.muscleGroup])
          .order('nome');
        
        if (error) {
          console.error('Error fetching exercises:', error);
          return;
        }
        
        if (data) {
          console.log(`Found ${data.length} exercises for ${exercise.muscleGroup}:`, data);
          // Convert Supabase data to our required type
          const typedExercises: Array<{ nome: string }> = data.map(ex => ({ nome: ex.nome }));
          setExercises(typedExercises);
        }
      } catch (error) {
        console.error('Exception while fetching exercises:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExercises();
  }, [exercise.muscleGroup]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3">
        <ExerciseHeader
          exercise={exercise}
          dragHandleProps={provided.dragHandleProps}
          onDelete={onDelete}
          onExerciseUpdate={onExerciseUpdate}
          mode={mode}
        />
        <ExerciseNameSelect
          exercise={exercise}
          exercises={exercises}
          isLoading={isLoading}
          onExerciseUpdate={onExerciseUpdate}
        />
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ExerciseDetails
          exercise={exercise}
          repsRanges={repsRanges}
          onExerciseUpdate={onExerciseUpdate}
        />
      </CardContent>
    </Card>
  );
}
