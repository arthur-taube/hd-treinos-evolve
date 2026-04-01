
-- Function: apply_temporary_substitution_advanced
CREATE OR REPLACE FUNCTION public.apply_temporary_substitution_advanced(
  p_exercise_id uuid,
  p_substitute_exercise_id uuid,
  p_substitute_name text,
  p_is_custom_substitute boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.exercicios_treino_usuario_avancado etu
    JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
    JOIN public.programas_usuario pu ON tu.programa_usuario_id = pu.id
    WHERE etu.id = p_exercise_id AND pu.usuario_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: This exercise does not belong to you';
  END IF;
  
  UPDATE public.exercicios_treino_usuario_avancado
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

GRANT EXECUTE ON FUNCTION public.apply_temporary_substitution_advanced(uuid, uuid, text, boolean) TO authenticated;

-- Function: replace_exercise_future_instances_advanced
CREATE OR REPLACE FUNCTION public.replace_exercise_future_instances_advanced(
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
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_current_exercise record;
  v_current_workout record;
  v_current_program_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_current_exercise
  FROM public.exercicios_treino_usuario_avancado
  WHERE id = p_current_exercise_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;
  
  SELECT tu.*
  INTO v_current_workout
  FROM public.treinos_usuario tu
  WHERE tu.id = v_current_exercise.treino_usuario_id;
  
  v_current_program_user_id := v_current_workout.programa_usuario_id;
  
  UPDATE public.exercicios_treino_usuario_avancado
  SET 
    nome = p_new_exercise_name,
    grupo_muscular = p_new_muscle_group,
    series = p_new_series,
    repeticoes = p_new_reps,
    exercicio_original_id = CASE 
      WHEN p_is_custom_exercise THEN null 
      ELSE p_new_exercise_id 
    END,
    substituto_oficial_id = CASE 
      WHEN p_is_custom_exercise THEN null 
      ELSE p_new_exercise_id 
    END,
    substituto_custom_id = CASE 
      WHEN p_is_custom_exercise THEN p_new_exercise_id 
      ELSE null 
    END,
    substituto_nome = p_new_exercise_name,
    peso = null,
    configuracao_inicial = false,
    incremento_minimo = null,
    concluido = false
  WHERE id IN (
    SELECT etu.id
    FROM public.exercicios_treino_usuario_avancado etu
    JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
    WHERE tu.programa_usuario_id = v_current_program_user_id
      AND tu.ordem_dia = v_current_workout.ordem_dia
      AND etu.concluido = false
      AND tu.ordem_semana >= v_current_workout.ordem_semana
      AND (
        (v_current_exercise.card_original_id IS NOT NULL AND etu.card_original_id = v_current_exercise.card_original_id)
        OR
        (v_current_exercise.card_original_id IS NULL AND etu.exercicio_original_id = v_current_exercise.exercicio_original_id AND etu.ordem = v_current_exercise.ordem)
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_exercise_future_instances_advanced(uuid, uuid, text, integer, text, text, boolean) TO authenticated;
