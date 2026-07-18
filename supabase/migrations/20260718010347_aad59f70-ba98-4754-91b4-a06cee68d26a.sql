
-- deload_semanas
CREATE TABLE public.deload_semanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_usuario_id uuid NOT NULL REFERENCES public.programas_usuario(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  data_concluido timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programa_usuario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deload_semanas TO authenticated;
GRANT ALL ON public.deload_semanas TO service_role;
ALTER TABLE public.deload_semanas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own deload_semanas" ON public.deload_semanas
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- deload_dias
CREATE TABLE public.deload_dias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deload_semana_id uuid NOT NULL REFERENCES public.deload_semanas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ordem_dia integer NOT NULL,
  nome text NOT NULL,
  treino_origem_id uuid,
  metade text NOT NULL CHECK (metade IN ('primeira','segunda')),
  concluido boolean NOT NULL DEFAULT false,
  data_concluido timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deload_dias TO authenticated;
GRANT ALL ON public.deload_dias TO service_role;
ALTER TABLE public.deload_dias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own deload_dias" ON public.deload_dias
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_deload_dias_semana ON public.deload_dias(deload_semana_id);

-- deload_series
CREATE TABLE public.deload_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deload_dia_id uuid NOT NULL REFERENCES public.deload_dias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  exercicio_nome text NOT NULL,
  grupo_muscular text,
  ordem integer NOT NULL,
  modo text NOT NULL CHECK (modo IN ('volume','carga','combinado')),
  numero_serie integer NOT NULL,
  peso numeric,
  repeticoes integer,
  concluida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deload_series TO authenticated;
GRANT ALL ON public.deload_series TO service_role;
ALTER TABLE public.deload_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own deload_series" ON public.deload_series
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_deload_series_dia ON public.deload_series(deload_dia_id);

-- update_updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deload_semanas_updated BEFORE UPDATE ON public.deload_semanas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deload_dias_updated BEFORE UPDATE ON public.deload_dias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deload_series_updated BEFORE UPDATE ON public.deload_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
