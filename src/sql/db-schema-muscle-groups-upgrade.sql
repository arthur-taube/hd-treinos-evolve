
-- Upgrade exercicios_iniciantes table to support muscle groups as arrays
ALTER TABLE public.exercicios_iniciantes
ALTER COLUMN grupo_muscular TYPE text[] USING ARRAY[grupo_muscular];

-- Update comments for clarity
COMMENT ON COLUMN public.exercicios_iniciantes.grupo_muscular IS 'Array of muscle groups this exercise belongs to';

-- Create index to improve performance for array operations
CREATE INDEX idx_exercicios_iniciantes_grupo_muscular ON public.exercicios_iniciantes USING GIN (grupo_muscular);
