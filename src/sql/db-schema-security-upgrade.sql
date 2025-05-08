
-- Add user_id column to series_exercicio_usuario table
ALTER TABLE public.series_exercicio_usuario
ADD COLUMN user_id UUID;

-- Create index for better query performance
CREATE INDEX idx_series_exercicio_usuario_user_id ON public.series_exercicio_usuario(user_id);

-- Update the RLS policy
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.series_exercicio_usuario;
CREATE POLICY "Users can only access their own series data" ON public.series_exercicio_usuario
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Add comment for clarity
COMMENT ON COLUMN public.series_exercicio_usuario.user_id IS 'Reference to the user who owns this series data';

-- Foreign key constraint to auth.users (optional, depending on Supabase setup)
-- ALTER TABLE public.series_exercicio_usuario
-- ADD CONSTRAINT series_exercicio_usuario_user_id_fkey
-- FOREIGN KEY (user_id)
-- REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records based on the relationship chain
-- This updates series records with the user_id from programas_usuario through the relationship chain
UPDATE public.series_exercicio_usuario seu
SET user_id = pu.usuario_id
FROM public.exercicios_treino_usuario etu
JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
JOIN public.programas_usuario pu ON tu.programa_usuario_id = pu.id
WHERE seu.exercicio_usuario_id = etu.id;
