-- ================================================
-- Migration: Suporte a customização de programas
-- ================================================

-- 1. Adicionar coluna nome_personalizado em treinos_usuario
ALTER TABLE treinos_usuario 
  ADD COLUMN IF NOT EXISTS nome_personalizado TEXT;

COMMENT ON COLUMN treinos_usuario.nome_personalizado IS 
  'Título personalizado do dia do treino (ex: "Superiores", "Inferiores")';

-- 2. Remover constraint UNIQUE que impede múltiplas customizações
ALTER TABLE programas_usuario 
  DROP CONSTRAINT IF EXISTS programas_usuario_usuario_id_programa_original_id_ativo_key;

-- 3. Criar UNIQUE PARTIAL INDEX para permitir histórico
CREATE UNIQUE INDEX IF NOT EXISTS programas_usuario_one_active_per_user_program 
  ON programas_usuario (usuario_id, programa_original_id) 
  WHERE ativo = true;

COMMENT ON INDEX programas_usuario_one_active_per_user_program IS 
  'Garante que cada usuário tenha apenas 1 programa ativo por programa_original_id, mas permite múltiplas customizações inativas (histórico)';