-- Corrigir ordens 0-based existentes para 1-based em exercicios_treino_usuario
UPDATE exercicios_treino_usuario 
SET ordem = ordem + 1 
WHERE treino_usuario_id IN (
  SELECT DISTINCT treino_usuario_id 
  FROM exercicios_treino_usuario 
  WHERE ordem = 0
);