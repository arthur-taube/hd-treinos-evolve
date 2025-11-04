-- Add customization fields to programas_usuario table (only new columns)
ALTER TABLE programas_usuario 
  ADD COLUMN IF NOT EXISTS nome_personalizado TEXT,
  ADD COLUMN IF NOT EXISTS tipo_cronograma TEXT CHECK (tipo_cronograma IN ('recomendado', 'personalizado', 'flexivel')),
  ADD COLUMN IF NOT EXISTS cronograma_dados JSONB;

-- Add comments for documentation
COMMENT ON COLUMN programas_usuario.nome_personalizado IS 'Nome personalizado dado pelo usuário ao programa (max 80 chars)';
COMMENT ON COLUMN programas_usuario.tipo_cronograma IS 'Tipo de cronograma escolhido: recomendado, personalizado ou flexivel';
COMMENT ON COLUMN programas_usuario.cronograma_dados IS 'Dados do cronograma escolhido em formato JSON';