-- ============================================
-- 1. CREATE USER ROLES SYSTEM
-- ============================================

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'developer', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Insert admin role for the developer (replace with actual admin setup later)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'arthurtaube.com.br@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- 2. FIX SECURITY DEFINER FUNCTIONS - ADD search_path
-- ============================================

-- Fix auto_populate_exercise_data
CREATE OR REPLACE FUNCTION public.auto_populate_exercise_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.exercicio_original_id IS NOT NULL THEN
    UPDATE exercicios_treino_usuario 
    SET 
      primary_muscle = COALESCE(NEW.primary_muscle, ei.primary_muscle),
      secondary_muscle = COALESCE(NEW.secondary_muscle, ei.secondary_muscle),
      video_url = COALESCE(NEW.video_url, ei.video_url)
    FROM exercicios_iniciantes ei
    WHERE exercicios_treino_usuario.id = NEW.id 
      AND ei.id = NEW.exercicio_original_id
      AND (NEW.primary_muscle IS NULL OR NEW.secondary_muscle IS NULL OR NEW.video_url IS NULL);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix propagate_increment_config
CREATE OR REPLACE FUNCTION public.propagate_increment_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF (TG_OP = 'UPDATE' AND (
        OLD.incremento_minimo IS DISTINCT FROM NEW.incremento_minimo OR
        OLD.configuracao_inicial IS DISTINCT FROM NEW.configuracao_inicial
    )) OR (TG_OP = 'INSERT' AND (NEW.configuracao_inicial = TRUE OR NEW.incremento_minimo IS NOT NULL)) THEN
        
        IF NEW.incremento_minimo IS NOT NULL AND (NEW.configuracao_inicial IS NULL OR NEW.configuracao_inicial = FALSE) THEN
            NEW.configuracao_inicial = TRUE;
        END IF;
        
        UPDATE exercicios_treino_usuario etu
        SET 
            incremento_minimo = COALESCE(NEW.incremento_minimo, etu.incremento_minimo),
            configuracao_inicial = CASE 
                WHEN NEW.incremento_minimo IS NOT NULL OR NEW.configuracao_inicial = TRUE THEN TRUE 
                ELSE etu.configuracao_inicial 
            END
        FROM treinos_usuario tu, treinos_usuario tu_source
        WHERE etu.treino_usuario_id = tu.id
        AND NEW.treino_usuario_id = tu_source.id
        AND tu.programa_usuario_id = tu_source.programa_usuario_id
        AND etu.exercicio_original_id = NEW.exercicio_original_id
        AND etu.concluido = FALSE
        AND etu.id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Fix get_available_exercises (already has SET search_path, but ensuring it's correct)
CREATE OR REPLACE FUNCTION public.get_available_exercises(p_muscle_group text)
RETURNS TABLE(id uuid, nome text, is_custom boolean, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ei.id,
    ei.nome,
    false as is_custom,
    null::uuid as user_id
  FROM public.exercicios_iniciantes ei
  WHERE p_muscle_group = ANY(ei.grupo_muscular)
  
  UNION ALL
  
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
$function$;

-- Fix apply_temporary_substitution (already has SET search_path)
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
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.exercicios_treino_usuario etu
    JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
    JOIN public.programas_usuario pu ON tu.programa_usuario_id = pu.id
    WHERE etu.id = p_exercise_id AND pu.usuario_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: This exercise does not belong to you';
  END IF;
  
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
$function$;

-- Fix replace_exercise_future_instances (already has SET search_path)
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
AS $function$
DECLARE
  v_user_id uuid;
  v_current_exercise record;
  v_current_workout record;
  v_current_program_user_id uuid;
  v_original_training_name text;
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_current_exercise
  FROM public.exercicios_treino_usuario
  WHERE id = p_current_exercise_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;
  
  SELECT tu.*, t.nome as treino_original_nome
  INTO v_current_workout
  FROM public.treinos_usuario tu
  JOIN public.treinos t ON tu.treino_original_id = t.id
  WHERE tu.id = v_current_exercise.treino_usuario_id;
  
  v_current_program_user_id := v_current_workout.programa_usuario_id;
  v_original_training_name := v_current_workout.treino_original_nome;
  
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
    JOIN public.treinos t ON tu.treino_original_id = t.id
    WHERE etu.exercicio_original_id = v_current_exercise.exercicio_original_id
      AND tu.programa_usuario_id = v_current_program_user_id
      AND t.nome = v_original_training_name
      AND etu.concluido = false
      AND tu.ordem_semana >= v_current_workout.ordem_semana
  );
END;
$function$;

-- Fix create_profile_for_user
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$function$;

-- Fix get_series_by_exercise (already has SET search_path but ensuring)
CREATE OR REPLACE FUNCTION public.get_series_by_exercise(exercise_id uuid)
RETURNS SETOF series_exercicio_usuario
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    RETURN QUERY
    SELECT * FROM public.series_exercicio_usuario
    WHERE exercicio_usuario_id = exercise_id
    AND user_id = v_user_id
    ORDER BY numero_serie;
END;
$function$;

-- Fix save_series
CREATE OR REPLACE FUNCTION public.save_series(
  p_exercicio_id uuid, 
  p_numero_serie integer, 
  p_peso numeric, 
  p_repeticoes integer, 
  p_concluida boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF NOT EXISTS (
        SELECT 1 FROM public.exercicios_treino_usuario etu
        JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
        JOIN public.programas_usuario pu ON tu.programa_usuario_id = pu.id
        WHERE etu.id = p_exercicio_id AND pu.usuario_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Access denied: This exercise does not belong to you';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.series_exercicio_usuario 
        WHERE exercicio_usuario_id = p_exercicio_id 
        AND numero_serie = p_numero_serie
        AND user_id = v_user_id
    ) THEN
        UPDATE public.series_exercicio_usuario
        SET 
            peso = p_peso,
            repeticoes = p_repeticoes,
            concluida = p_concluida,
            updated_at = now()
        WHERE 
            exercicio_usuario_id = p_exercicio_id 
            AND numero_serie = p_numero_serie
            AND user_id = v_user_id;
    ELSE
        INSERT INTO public.series_exercicio_usuario (
            exercicio_usuario_id,
            user_id,
            numero_serie,
            peso,
            repeticoes,
            concluida
        ) VALUES (
            p_exercicio_id,
            v_user_id,
            p_numero_serie,
            p_peso,
            p_repeticoes,
            p_concluida
        );
    END IF;
END;
$function$;

-- ============================================
-- 3. ENABLE RLS ON EXERCISE TABLES
-- ============================================

-- Enable RLS on exercicios_iniciantes
ALTER TABLE public.exercicios_iniciantes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view exercises
CREATE POLICY "Anyone can view exercises"
ON public.exercicios_iniciantes
FOR SELECT
USING (true);

-- Policy: Only admins can modify exercises
CREATE POLICY "Only admins can modify exercises"
ON public.exercicios_iniciantes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Enable RLS on exercicios_iniciantes_2
ALTER TABLE public.exercicios_iniciantes_2 ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view exercises
CREATE POLICY "Anyone can view exercises"
ON public.exercicios_iniciantes_2
FOR SELECT
USING (true);

-- Policy: Only admins can modify exercises
CREATE POLICY "Only admins can modify exercises"
ON public.exercicios_iniciantes_2
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. FIX OVERLY PERMISSIVE INSERT POLICIES
-- ============================================

-- Drop old policy on treinos_usuario
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.treinos_usuario;

-- Create new policy with proper user_id check
CREATE POLICY "Users can insert their own workouts"
ON public.treinos_usuario
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.programas_usuario pu
    WHERE pu.id = treinos_usuario.programa_usuario_id
    AND pu.usuario_id = auth.uid()
  )
);

-- Drop old policy on exercicios_treino_usuario
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.exercicios_treino_usuario;

-- Create new policy with proper user_id check
CREATE POLICY "Users can insert exercises in their own workouts"
ON public.exercicios_treino_usuario
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.treinos_usuario tu
    JOIN public.programas_usuario pu ON tu.programa_usuario_id = pu.id
    WHERE tu.id = exercicios_treino_usuario.treino_usuario_id
    AND pu.usuario_id = auth.uid()
  )
);

-- ============================================
-- 5. ADD DATABASE CONSTRAINTS FOR INPUT VALIDATION
-- ============================================

-- Add length constraint to exercicios_custom.nome (max 45 characters)
ALTER TABLE public.exercicios_custom
ADD CONSTRAINT exercicios_custom_nome_length CHECK (char_length(nome) <= 45 AND char_length(nome) > 0);

-- Add length constraints to other user input fields
ALTER TABLE public.exercicios_treino_usuario
ADD CONSTRAINT exercicios_treino_usuario_nome_length CHECK (char_length(nome) <= 100 AND char_length(nome) > 0);

ALTER TABLE public.exercicios_treino_usuario
ADD CONSTRAINT exercicios_treino_usuario_observacao_length CHECK (char_length(observacao) <= 1000);

-- Add comment
COMMENT ON CONSTRAINT exercicios_custom_nome_length ON public.exercicios_custom IS 'Ensures custom exercise names are between 1 and 45 characters';