
-- This file contains SQL functions to be created in Supabase
-- You'll need to run these SQL commands in your Supabase SQL editor

-- Function to ensure the series_exercicio_usuario table exists
CREATE OR REPLACE FUNCTION public.ensure_series_table()
RETURNS void AS $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'series_exercicio_usuario'
    ) THEN
        -- Create the table if it doesn't exist
        CREATE TABLE public.series_exercicio_usuario (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            exercicio_usuario_id UUID NOT NULL,
            user_id UUID NOT NULL,  -- Added user_id column
            numero_serie INTEGER NOT NULL,
            peso NUMERIC NOT NULL DEFAULT 0,
            repeticoes INTEGER NOT NULL DEFAULT 0,
            concluida BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT fk_exercicio_usuario
                FOREIGN KEY(exercicio_usuario_id)
                REFERENCES public.exercicios_treino_usuario(id)
                ON DELETE CASCADE
        );

        -- Create indexes for faster lookups
        CREATE INDEX idx_series_exercicio_id ON public.series_exercicio_usuario(exercicio_usuario_id);
        CREATE INDEX idx_series_user_id ON public.series_exercicio_usuario(user_id);
        
        -- Enable RLS
        ALTER TABLE public.series_exercicio_usuario ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy with user_id check
        CREATE POLICY "Users can only access their own series data" ON public.series_exercicio_usuario
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save series data
CREATE OR REPLACE FUNCTION public.save_series(
    p_exercicio_id UUID,
    p_numero_serie INTEGER,
    p_peso NUMERIC,
    p_repeticoes INTEGER,
    p_concluida BOOLEAN
)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Check if the user has permission to access this exercise
    -- This verifies the exercise belongs to the user through the relationship chain
    IF NOT EXISTS (
        SELECT 1 FROM public.exercicios_treino_usuario etu
        JOIN public.treinos_usuario tu ON etu.treino_usuario_id = tu.id
        JOIN public.programas_usuario pu ON tu.programa_usuario_id = pu.id
        WHERE etu.id = p_exercicio_id AND pu.usuario_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Access denied: This exercise does not belong to you';
    END IF;

    -- Check if the series already exists for this exercise and number
    IF EXISTS (
        SELECT 1 FROM public.series_exercicio_usuario 
        WHERE exercicio_usuario_id = p_exercicio_id 
        AND numero_serie = p_numero_serie
        AND user_id = v_user_id
    ) THEN
        -- Update existing series
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
        -- Insert new series
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get series data by exercise
CREATE OR REPLACE FUNCTION public.get_series_by_exercise(exercise_id UUID)
RETURNS SETOF public.series_exercicio_usuario AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    RETURN QUERY
    SELECT * FROM public.series_exercicio_usuario
    WHERE exercicio_usuario_id = exercise_id
    AND user_id = v_user_id
    ORDER BY numero_serie;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

