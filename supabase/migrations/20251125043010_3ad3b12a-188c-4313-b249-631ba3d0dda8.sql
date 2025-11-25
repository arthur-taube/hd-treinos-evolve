-- ================================================
-- Migration: Corrigir constraint de programa ativo
-- ================================================

-- 1. Remover o index anterior
DROP INDEX IF EXISTS programas_usuario_one_active_per_user_program;

-- 2. Desativar programas ativos duplicados (mantém apenas o mais recente)
UPDATE programas_usuario pu1
SET ativo = false
WHERE ativo = true
  AND EXISTS (
    SELECT 1 
    FROM programas_usuario pu2
    WHERE pu2.usuario_id = pu1.usuario_id
      AND pu2.ativo = true
      AND pu2.created_at > pu1.created_at
  );

-- 3. Criar novo index que garante apenas 1 programa ativo por usuário
CREATE UNIQUE INDEX programas_usuario_one_active_per_user 
  ON programas_usuario (usuario_id) 
  WHERE ativo = true;

COMMENT ON INDEX programas_usuario_one_active_per_user IS 
  'Garante que cada usuário tenha apenas 1 programa ativo no total, independente do programa_original_id. Permite múltiplas customizações inativas (histórico).';