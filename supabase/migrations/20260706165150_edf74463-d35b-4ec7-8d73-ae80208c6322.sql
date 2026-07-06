ALTER TABLE public.exercicios_treino_usuario_avancado
  ADD COLUMN IF NOT EXISTS deload boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avaliacao_desempenho text,
  ADD COLUMN IF NOT EXISTS progressao_base_peso numeric,
  ADD COLUMN IF NOT EXISTS progressao_base_reps integer;