
-- Adicionar coluna reps_programadas para armazenar as repetições programadas
ALTER TABLE exercicios_treino_usuario 
ADD COLUMN reps_programadas INTEGER;

-- Comentário: Esta coluna armazenará:
-- - Na primeira semana: o número de repetições da pior série executada
-- - Nas semanas seguintes: o número de repetições programadas para aquela semana
-- - NULL indica que ainda não foi determinado (primeira execução)
