
-- 1. Add card_original_id column
ALTER TABLE exercicios_treino_usuario 
ADD COLUMN card_original_id uuid REFERENCES exercicios_treino(id);

-- 2. Backfill existing data: match by exercicio_original_id + treino_original_id
UPDATE exercicios_treino_usuario etu
SET card_original_id = et.id
FROM treinos_usuario tu, exercicios_treino et
WHERE etu.treino_usuario_id = tu.id
AND et.treino_id = tu.treino_original_id
AND et.exercicio_original_id = etu.exercicio_original_id
AND etu.exercicio_original_id IS NOT NULL
AND etu.card_original_id IS NULL;

-- 3. Update replace_exercise_future_instances to use card_original_id
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
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_current_exercise
  FROM public.exercicios_treino_usuario
  WHERE id = p_current_exercise_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;
  
  SELECT tu.*
  INTO v_current_workout
  FROM public.treinos_usuario tu
  WHERE tu.id = v_current_exercise.treino_usuario_id;
  
  v_current_program_user_id := v_current_workout.programa_usuario_id;
  
  -- Update future exercises matching by card_original_id (preferred) or exercicio_original_id+ordem (fallback)
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
    reps_programadas = null,
    concluido = false
  WHERE id IN (
    SELECT etu.id
    FROM public.exercicios_treino_usuario etu
    JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
    WHERE tu.programa_usuario_id = v_current_program_user_id
      AND tu.ordem_dia = v_current_workout.ordem_dia
      AND etu.concluido = false
      AND tu.ordem_semana >= v_current_workout.ordem_semana
      AND (
        -- Primary match: card_original_id (works for custom and reordered exercises)
        (v_current_exercise.card_original_id IS NOT NULL AND etu.card_original_id = v_current_exercise.card_original_id)
        OR
        -- Fallback: exercicio_original_id + ordem (legacy data without card_original_id)
        (v_current_exercise.card_original_id IS NULL AND etu.exercicio_original_id = v_current_exercise.exercicio_original_id AND etu.ordem = v_current_exercise.ordem)
      )
  );
END;
$function$;
