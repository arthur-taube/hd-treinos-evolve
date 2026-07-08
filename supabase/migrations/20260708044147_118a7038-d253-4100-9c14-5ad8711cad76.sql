ALTER TABLE public.mesociclos
  ADD COLUMN IF NOT EXISTS semanas_min integer,
  ADD COLUMN IF NOT EXISTS semanas_max integer;

UPDATE public.mesociclos
  SET semanas_min = COALESCE(semanas_min, duracao_semanas),
      semanas_max = COALESCE(semanas_max, duracao_semanas);