-- Fix remaining functions without SET search_path

-- Fix ensure_series_table
CREATE OR REPLACE FUNCTION public.ensure_series_table()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'series_exercicio_usuario'
    ) THEN
        CREATE TABLE public.series_exercicio_usuario (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            exercicio_usuario_id UUID NOT NULL,
            user_id UUID NOT NULL,
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

        CREATE INDEX idx_series_exercicio_id ON public.series_exercicio_usuario(exercicio_usuario_id);
        CREATE INDEX idx_series_user_id ON public.series_exercicio_usuario(user_id);
        
        ALTER TABLE public.series_exercicio_usuario ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can only access their own series data" ON public.series_exercicio_usuario
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END;
$$;

-- Fix get_distinct_muscle_groups
CREATE OR REPLACE FUNCTION public.get_distinct_muscle_groups()
RETURNS TABLE (grupo_muscular text) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest(ei.grupo_muscular)::text
  FROM public.exercicios_iniciantes ei
  ORDER BY 1;
END;
$$;