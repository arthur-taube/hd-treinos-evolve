
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

        -- Create index for faster lookups
        CREATE INDEX idx_series_exercicio_id ON public.series_exercicio_usuario(exercicio_usuario_id);
        
        -- Enable RLS
        ALTER TABLE public.series_exercicio_usuario ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy
        CREATE POLICY "Enable all operations for authenticated users" ON public.series_exercicio_usuario
            USING (true)
            WITH CHECK (true);
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
BEGIN
    -- Check if the series already exists for this exercise and number
    IF EXISTS (
        SELECT 1 FROM public.series_exercicio_usuario 
        WHERE exercicio_usuario_id = p_exercicio_id 
        AND numero_serie = p_numero_serie
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
            AND numero_serie = p_numero_serie;
    ELSE
        -- Insert new series
        INSERT INTO public.series_exercicio_usuario (
            exercicio_usuario_id,
            numero_serie,
            peso,
            repeticoes,
            concluida
        ) VALUES (
            p_exercicio_id,
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
BEGIN
    RETURN QUERY
    SELECT * FROM public.series_exercicio_usuario
    WHERE exercicio_usuario_id = exercise_id
    ORDER BY numero_serie;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
