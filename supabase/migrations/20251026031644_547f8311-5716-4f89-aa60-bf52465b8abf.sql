-- Adicionar ordem_dia à tabela treinos
ALTER TABLE treinos ADD COLUMN IF NOT EXISTS ordem_dia INTEGER;

-- Popular ordem_dia baseado em mapeamento padrão de dias da semana
UPDATE treinos t
SET ordem_dia = CASE t.dia_semana
  WHEN 'segunda' THEN 1
  WHEN 'terca' THEN 2
  WHEN 'quarta' THEN 3
  WHEN 'quinta' THEN 4
  WHEN 'sexta' THEN 5
  WHEN 'sabado' THEN 6
  WHEN 'domingo' THEN 7
  ELSE NULL
END
WHERE t.ordem_dia IS NULL AND t.dia_semana IS NOT NULL;

-- Para treinos sem dia_semana, usar ROW_NUMBER baseado em nome
WITH treinos_sem_ordem AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY programa_id, ordem_semana ORDER BY nome) as row_num
  FROM treinos
  WHERE ordem_dia IS NULL
)
UPDATE treinos t
SET ordem_dia = tso.row_num
FROM treinos_sem_ordem tso
WHERE t.id = tso.id;

-- Tornar ordem_dia NOT NULL após popular
ALTER TABLE treinos ALTER COLUMN ordem_dia SET NOT NULL;

-- Adicionar colunas à treinos_usuario
ALTER TABLE treinos_usuario ADD COLUMN IF NOT EXISTS ordem_dia INTEGER;
ALTER TABLE treinos_usuario ADD COLUMN IF NOT EXISTS dia_semana TEXT;

-- Popular ordem_dia nos treinos_usuario existentes (copiar do treino original)
UPDATE treinos_usuario tu
SET ordem_dia = t.ordem_dia
FROM treinos t
WHERE tu.treino_original_id = t.id
AND tu.ordem_dia IS NULL;

-- Tornar ordem_dia NOT NULL
ALTER TABLE treinos_usuario ALTER COLUMN ordem_dia SET NOT NULL;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_treinos_ordem_dia ON treinos(ordem_dia);
CREATE INDEX IF NOT EXISTS idx_treinos_usuario_ordem_dia ON treinos_usuario(ordem_dia);