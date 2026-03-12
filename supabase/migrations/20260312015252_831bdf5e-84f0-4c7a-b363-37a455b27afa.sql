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