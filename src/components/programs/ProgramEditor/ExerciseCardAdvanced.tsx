
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Exercise } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseHeader } from "./components/ExerciseHeader";
import { ExerciseNameSelect } from "./components/ExerciseNameSelect";
import { ExerciseDetailsAdvanced } from "./components/ExerciseDetailsAdvanced";

interface RepsRangeAdvanced {
  id: string;
  min_reps: number;
  max_reps: number;
}

// Module-level cache for advanced reps ranges
let advancedRepsRangesCache: RepsRangeAdvanced[] | null = null;
let advancedRepsRangesFetchPromise: Promise<RepsRangeAdvanced[]> | null = null;

interface ExerciseCardAdvancedProps {
  exercise: Exercise;
  provided: any;
  onDelete: () => void;
  onExerciseUpdate: (field: keyof Exercise, value: string | number | boolean) => void;
  mode?: 'edit' | 'customize';
}

export function ExerciseCardAdvanced({
  exercise,
  provided,
  onDelete,
  onExerciseUpdate,
  mode = 'edit',
}: ExerciseCardAdvancedProps) {
  const [exercises, setExercises] = useState<Array<{ nome: string }>>([]);
  const [repsRanges, setRepsRanges] = useState<RepsRangeAdvanced[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRepsRanges = async (): Promise<RepsRangeAdvanced[]> => {
      const { data, error } = await supabase
        .from('faixas_repeticoes_avancado')
        .select('*')
        .order('min_reps');
      
      if (error) {
        console.error('Error fetching advanced reps ranges:', error);
        return [];
      }

      if (data) {
        return data.map(range => ({
          id: range.id,
          min_reps: range.min_reps,
          max_reps: range.max_reps,
        }));
      }
      
      return [];
    };

    const loadRepsRanges = async () => {
      if (advancedRepsRangesCache) {
        setRepsRanges(advancedRepsRangesCache);
        return;
      }

      if (advancedRepsRangesFetchPromise) {
        const ranges = await advancedRepsRangesFetchPromise;
        setRepsRanges(ranges);
        return;
      }

      advancedRepsRangesFetchPromise = fetchRepsRanges();
      const ranges = await advancedRepsRangesFetchPromise;
      advancedRepsRangesCache = ranges;
      advancedRepsRangesFetchPromise = null;
      setRepsRanges(ranges);
    };

    loadRepsRanges();
  }, []);

  useEffect(() => {
    const fetchExercises = async () => {
      if (!exercise.muscleGroup) return;
      
      setIsLoading(true);
      console.log(`Fetching advanced exercises for muscle group: ${exercise.muscleGroup}`);
      
      try {
        // exercicios_avancados uses text field (not array), so use .eq()
        const { data, error } = await supabase
          .from('exercicios_avancados')
          .select('nome')
          .eq('grupo_muscular', exercise.muscleGroup)
          .order('nome');
        
        if (error) {
          console.error('Error fetching advanced exercises:', error);
          return;
        }
        
        if (data) {
          console.log(`Found ${data.length} advanced exercises for ${exercise.muscleGroup}`);
          const typedExercises: Array<{ nome: string }> = data.map(ex => ({ nome: ex.nome }));
          setExercises(typedExercises);
        }
      } catch (error) {
        console.error('Exception while fetching advanced exercises:', error);
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
        <ExerciseDetailsAdvanced
          exercise={exercise}
          repsRanges={repsRanges}
          onExerciseUpdate={onExerciseUpdate}
        />
      </CardContent>
    </Card>
  );
}
