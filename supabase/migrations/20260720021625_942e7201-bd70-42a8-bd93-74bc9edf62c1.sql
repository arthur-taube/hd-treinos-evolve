ALTER TABLE public.exercicios_iniciantes
  ADD COLUMN IF NOT EXISTS auxiliary_muscle_1 text,
  ADD COLUMN IF NOT EXISTS auxiliary_muscle_2 text,
  ADD COLUMN IF NOT EXISTS auxiliary_muscle_3 text,
  ADD COLUMN IF NOT EXISTS auxiliary_muscle_4 text;

ALTER TABLE public.exercicios_avancados
  ADD COLUMN IF NOT EXISTS auxiliary_muscle_1 text,
  ADD COLUMN IF NOT EXISTS auxiliary_muscle_2 text,
  ADD COLUMN IF NOT EXISTS auxiliary_muscle_3 text,
  ADD COLUMN IF NOT EXISTS auxiliary_muscle_4 text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stats_volume_grupos_padrao text[];