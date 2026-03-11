
-- 1. Add missing columns to exercicios_avancados
ALTER TABLE public.exercicios_avancados
  ADD COLUMN IF NOT EXISTS grande_grupo text,
  ADD COLUMN IF NOT EXISTS primary_muscle text,
  ADD COLUMN IF NOT EXISTS secondary_muscle text,
  ADD COLUMN IF NOT EXISTS tertiary_muscle text,
  ADD COLUMN IF NOT EXISTS quaternary_muscle text;

-- 2. Create faixas_repeticoes_avancado table
CREATE TABLE public.faixas_repeticoes_avancado (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_reps integer NOT NULL,
  max_reps integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.faixas_repeticoes_avancado ENABLE ROW LEVEL SECURITY;

-- 4. Public SELECT policy
CREATE POLICY "Permitir leitura de faixas avançadas para todos"
ON public.faixas_repeticoes_avancado
FOR SELECT TO public
USING (true);

-- 5. Insert the advanced rep ranges
INSERT INTO public.faixas_repeticoes_avancado (min_reps, max_reps) VALUES
  (5, 10),
  (6, 12),
  (10, 15),
  (10, 20),
  (15, 20),
  (20, 30);

-- 6. Create RPC for advanced muscle groups
CREATE OR REPLACE FUNCTION public.get_distinct_muscle_groups_avancado()
RETURNS TABLE (grupo_muscular text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ea.grupo_muscular
  FROM public.exercicios_avancados ea
  ORDER BY 1;
END;
$$;

COMMENT ON FUNCTION public.get_distinct_muscle_groups_avancado() IS 'Returns all distinct muscle groups from advanced exercises';

GRANT EXECUTE ON FUNCTION public.get_distinct_muscle_groups_avancado() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_distinct_muscle_groups_avancado() TO anon;
