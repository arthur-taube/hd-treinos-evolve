-- Add nota column to series_exercicio_usuario table
ALTER TABLE public.series_exercicio_usuario 
ADD COLUMN nota TEXT;

-- Update the existing replace_exercise_future_instances function to allow same exercise substitutions
CREATE OR REPLACE FUNCTION public.replace_exercise_future_instances(p_current_exercise_id uuid, p_new_exercise_id uuid, p_new_exercise_name text, p_new_series integer, p_new_reps text, p_new_muscle_group text, p_is_custom_exercise boolean DEFAULT false)
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
  -- Removed the restriction that prevented same exercise substitutions
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
$function$