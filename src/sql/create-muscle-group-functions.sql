
-- Function to get distinct muscle groups from the array column
CREATE OR REPLACE FUNCTION public.get_distinct_muscle_groups()
RETURNS TABLE (grupo_muscular text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest(ei.grupo_muscular)::text
  FROM public.exercicios_iniciantes ei
  ORDER BY 1;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_distinct_muscle_groups() IS 'Returns all distinct muscle groups across all exercises';

-- Grant access to the authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.get_distinct_muscle_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_distinct_muscle_groups() TO anon;
