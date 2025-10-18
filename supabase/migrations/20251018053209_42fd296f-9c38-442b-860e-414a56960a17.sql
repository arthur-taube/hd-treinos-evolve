-- Update replace_exercise_future_instances to always record substitution details
-- even when replacing with the same exercise ID
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
SET search_path TO 'public'
AS $function$
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
  -- ALWAYS record substitution details, even for same exercise ID
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
    -- ALWAYS record substitution details
    substituto_oficial_id = CASE 
      WHEN p_is_custom_exercise THEN null 
      ELSE p_new_exercise_id 
    END,
    substituto_custom_id = CASE 
      WHEN p_is_custom_exercise THEN p_new_exercise_id 
      ELSE null 
    END,
    substituto_nome = p_new_exercise_name,
    -- Reset progression state (treat as first week)
    peso = null,
    configuracao_inicial = false,
    incremento_minimo = null,
    reps_programadas = null,
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
$function$;