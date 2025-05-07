
-- Add exercicio_original_id column to exercicios_treino table
ALTER TABLE public.exercicios_treino
ADD COLUMN exercicio_original_id UUID;

-- Create foreign key constraint referencing exercicios_iniciantes table
ALTER TABLE public.exercicios_treino
ADD CONSTRAINT exercicios_treino_exercicio_original_id_fkey
FOREIGN KEY (exercicio_original_id)
REFERENCES public.exercicios_iniciantes(id);

-- Update the foreign key constraint in exercicios_treino_usuario
-- First, drop the existing constraint
ALTER TABLE public.exercicios_treino_usuario
DROP CONSTRAINT IF EXISTS exercicios_treino_usuario_exercicio_original_id_fkey;

-- Then, add the correct constraint
ALTER TABLE public.exercicios_treino_usuario
ADD CONSTRAINT exercicios_treino_usuario_exercicio_original_id_fkey
FOREIGN KEY (exercicio_original_id)
REFERENCES public.exercicios_iniciantes(id);

-- Add comment for clarity
COMMENT ON COLUMN public.exercicios_treino.exercicio_original_id IS 'Reference to the original exercise in exercicios_iniciantes';
COMMENT ON COLUMN public.exercicios_treino_usuario.exercicio_original_id IS 'Reference to the original exercise in exercicios_iniciantes';
