
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

interface SpecialMethod {
  id: string;
  nome: string;
}

// Module-level cache for advanced reps ranges
let advancedRepsRangesCache: RepsRangeAdvanced[] | null = null;
let advancedRepsRangesFetchPromise: Promise<RepsRangeAdvanced[]> | null = null;

// Module-level cache for special methods
let specialMethodsCache: SpecialMethod[] | null = null;
let specialMethodsFetchPromise: Promise<SpecialMethod[]> | null = null;

interface ExerciseCardAdvancedProps {
  exercise: Exercise;
  provided: any;
  onDelete: () => void;
  onExerciseUpdate: (field: keyof Exercise, value: string | number | boolean) => void;
  mode?: 'edit' | 'customize';
  customizerMode?: boolean;
}

export function ExerciseCardAdvanced({
  exercise,
  provided,
  onDelete,
  onExerciseUpdate,
  mode = 'edit',
  customizerMode = false,
}: ExerciseCardAdvancedProps) {
  const [exercises, setExercises] = useState<Array<{ nome: string }>>([]);
  const [repsRanges, setRepsRanges] = useState<RepsRangeAdvanced[]>([]);
  const [specialMethods, setSpecialMethods] = useState<SpecialMethod[]>([]);
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

      return (data || []).map(range => ({
        id: range.id,
        min_reps: range.min_reps,
        max_reps: range.max_reps,
      }));
    };

    const fetchSpecialMethods = async (): Promise<SpecialMethod[]> => {
      const { data, error } = await supabase
        .from('metodos_especiais')
        .select('id, nome')
        .order('nome');
      
      if (error) {
        console.error('Error fetching special methods:', error);
        return [];
      }

      return (data || []).map(m => ({ id: m.id, nome: m.nome }));
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

    const loadSpecialMethods = async () => {
      if (specialMethodsCache) {
        setSpecialMethods(specialMethodsCache);
        return;
      }
      if (specialMethodsFetchPromise) {
        const methods = await specialMethodsFetchPromise;
        setSpecialMethods(methods);
        return;
      }
      specialMethodsFetchPromise = fetchSpecialMethods();
      const methods = await specialMethodsFetchPromise;
      specialMethodsCache = methods;
      specialMethodsFetchPromise = null;
      setSpecialMethods(methods);
    };

    loadRepsRanges();
    loadSpecialMethods();
  }, []);

  useEffect(() => {
    const fetchExercises = async () => {
      if (!exercise.muscleGroup) return;
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('exercicios_avancados')
          .select('nome')
          .overlaps('grupo_muscular', [exercise.muscleGroup])
          .order('nome');
        
        if (error) {
          console.error('Error fetching advanced exercises:', error);
          return;
        }
        
        if (data) {
          setExercises(data.map(ex => ({ nome: ex.nome })));
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
          specialMethods={specialMethods}
          onExerciseUpdate={onExerciseUpdate}
        />
      </CardContent>
    </Card>
  );
}
