-- Fix search path for functions to address security warnings
DROP FUNCTION IF EXISTS public.get_available_exercises(text);
DROP FUNCTION IF EXISTS public.replace_exercise_future_instances(uuid, uuid, text, integer, text, text, boolean);
DROP FUNCTION IF EXISTS public.apply_temporary_substitution(uuid, uuid, text, boolean);

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_available_exercises(p_muscle_group text)
RETURNS TABLE (
  id uuid,
  nome text,
  is_custom boolean,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Official exercises
  SELECT 
    ei.id,
    ei.nome,
    false as is_custom,
    null::uuid as user_id
  FROM public.exercicios_iniciantes ei
  WHERE p_muscle_group = ANY(ei.grupo_muscular)
  
  UNION ALL
  
  -- Custom exercises (only for current user)
  SELECT 
    ec.id,
    ec.nome,
    true as is_custom,
    ec.user_id
  FROM public.exercicios_custom ec
  WHERE ec.grupo_muscular = p_muscle_group
    AND ec.user_id = auth.uid()
  
  ORDER BY is_custom, nome;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_exercise_future_instances(
  p_current_exercise_id uuid,
  p_new_exercise_id uuid,
  p_new_exercise_name text,
  p_new_series integer,
  p_new_reps text,
  p_new_muscle_group text,
  p_is_custom_exercise boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_exercise record;
  v_current_workout record;
  v_current_program_user_id uuid;
  v_original_training_name text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get current exercise info
  SELECT * INTO v_current_exercise
  FROM public.exercicios_treino_usuario
  WHERE id = p_current_exercise_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;
  
  -- Get current workout info
  SELECT tu.*, t.nome as treino_original_nome
  INTO v_current_workout
  FROM public.treinos_usuario tu
  JOIN public.treinos t ON tu.treino_original_id = t.id
  WHERE tu.id = v_current_exercise.treino_usuario_id;
  
  -- Get program user id
  v_current_program_user_id := v_current_workout.programa_usuario_id;
  v_original_training_name := v_current_workout.treino_original_nome;
  
  -- Update all future exercises that match criteria
  UPDATE public.exercicios_treino_usuario
  SET 
    nome = p_new_exercise_name,
    grupo_muscular = p_new_muscle_group,
    series = p_new_series,
    repeticoes = p_new_reps,
    exercicio_original_id = CASE 
      WHEN p_is_custom_exercise THEN null 
      ELSE p_new_exercise_id 
    END,
    substituto_custom_id = CASE 
      WHEN p_is_custom_exercise THEN p_new_exercise_id 
      ELSE null 
    END,
    -- Reset progression state (like first week)
    peso = null,
    configuracao_inicial = false,
    incremento_minimo = null,
    concluido = false
  WHERE id IN (
    SELECT etu.id
    FROM public.exercicios_treino_usuario etu
    JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
    JOIN public.treinos t ON tu.treino_original_id = t.id
    WHERE etu.exercicio_original_id = v_current_exercise.exercicio_original_id
      AND tu.programa_usuario_id = v_current_program_user_id
      AND t.nome = v_original_training_name -- Same training day
      AND etu.concluido = false -- Only future exercises
      AND tu.ordem_semana >= v_current_workout.ordem_semana -- Current and future weeks
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_temporary_substitution(
  p_exercise_id uuid,
  p_substitute_exercise_id uuid,
  p_substitute_name text,
  p_is_custom_substitute boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user has access to this exercise
  IF NOT EXISTS (
    SELECT 1 FROM public.exercicios_treino_usuario etu
    JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
    JOIN public.programas_usuario pu ON tu.programa_usuario_id = pu.id
    WHERE etu.id = p_exercise_id AND pu.usuario_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: This exercise does not belong to you';
  END IF;
  
  -- Apply temporary substitution
  UPDATE public.exercicios_treino_usuario
  SET 
    substituicao_neste_treino = true,
    substituto_oficial_id = CASE 
      WHEN NOT p_is_custom_substitute THEN p_substitute_exercise_id 
      ELSE null 
    END,
    substituto_custom_id = CASE 
      WHEN p_is_custom_substitute THEN p_substitute_exercise_id 
      ELSE null 
    END,
    substituto_nome = p_substitute_name
  WHERE id = p_exercise_id;
END;
$$;