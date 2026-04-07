
CREATE OR REPLACE FUNCTION public.update_special_method_advanced(
  p_exercise_id uuid,
  p_method_name text DEFAULT NULL
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

  -- Get current exercise
  SELECT * INTO v_current_exercise
  FROM public.exercicios_treino_usuario_avancado
  WHERE id = p_exercise_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;

  -- Get current workout info
  SELECT tu.* INTO v_current_workout
  FROM public.treinos_usuario tu
  WHERE tu.id = v_current_exercise.treino_usuario_id;

  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.programas_usuario pu
    WHERE pu.id = v_current_workout.programa_usuario_id
      AND pu.usuario_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_current_program_user_id := v_current_workout.programa_usuario_id;

  -- Update current exercise + all future non-completed instances with same card_original_id
  UPDATE public.exercicios_treino_usuario_avancado
  SET metodo_especial = p_method_name
  WHERE id IN (
    SELECT etu.id
    FROM public.exercicios_treino_usuario_avancado etu
    JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
    WHERE tu.programa_usuario_id = v_current_program_user_id
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
