
-- Drop the existing FK constraint on series_exercicio_usuario
-- so that exercicio_usuario_id can reference either exercicios_treino_usuario 
-- or exercicios_treino_usuario_avancado
ALTER TABLE public.series_exercicio_usuario 
  DROP CONSTRAINT IF EXISTS fk_exercicio_usuario;

-- We don't re-add a FK because it would only allow one target table.
-- The RPC save_series also has a check against exercicios_treino_usuario,
-- so for advanced exercises we'll use direct inserts (already handled in hooks).
-- The RLS policy on series_exercicio_usuario uses user_id = auth.uid() which is sufficient.
