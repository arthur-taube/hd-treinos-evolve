
-- Step 1: Convert grupo_muscular from text (JSON-like) to text[]
ALTER TABLE public.exercicios_avancados
ALTER COLUMN grupo_muscular TYPE text[]
USING (
  string_to_array(
    trim(both '[]' from replace(grupo_muscular, '"', '')),
    ','
  )
);

-- Step 2: Trim whitespace from individual array elements
UPDATE public.exercicios_avancados
SET grupo_muscular = (
  SELECT array_agg(trim(elem))
  FROM unnest(grupo_muscular) AS elem
);

-- Step 3: Create GIN index for overlaps performance
CREATE INDEX IF NOT EXISTS idx_exercicios_avancados_grupo_muscular 
ON public.exercicios_avancados USING GIN (grupo_muscular);

-- Step 4: Recreate the RPC with unnest (now valid on text[])
CREATE OR REPLACE FUNCTION public.get_distinct_muscle_groups_avancado()
RETURNS TABLE(grupo_muscular text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest(ea.grupo_muscular)::text
  FROM public.exercicios_avancados ea
  ORDER BY 1;
END;
$$;
