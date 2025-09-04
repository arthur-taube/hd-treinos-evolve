
-- Alterar a coluna series para aceitar valores fracionados
ALTER TABLE public.exercicios_treino_usuario
ALTER COLUMN series TYPE numeric(5,2) USING series::numeric;

-- Opcional: adicionar um comentário explicativo
COMMENT ON COLUMN public.exercicios_treino_usuario.series IS 'Número de séries (fracionado), usado no cálculo de progressão. Ex.: 2.75';
