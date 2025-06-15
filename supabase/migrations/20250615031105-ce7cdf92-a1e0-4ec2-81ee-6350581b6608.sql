
-- Adicionar coluna nome_personalizado na tabela treinos
ALTER TABLE public.treinos 
ADD COLUMN nome_personalizado TEXT;

-- Tornar a coluna dia_semana opcional (permitir NULL)
ALTER TABLE public.treinos 
ALTER COLUMN dia_semana DROP NOT NULL;

-- Comentário: 
-- - nome_personalizado: armazenará nomes personalizados para os treinos (ex: "Superiores", "Inferiores")
-- - dia_semana: agora é opcional pois os usuários escolherão os dias através do cronograma
