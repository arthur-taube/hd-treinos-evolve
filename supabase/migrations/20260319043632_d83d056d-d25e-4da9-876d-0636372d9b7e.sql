
-- Tabela exercicios_treino_usuario_avancado
CREATE TABLE public.exercicios_treino_usuario_avancado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_usuario_id uuid NOT NULL REFERENCES public.treinos_usuario(id) ON DELETE CASCADE,
  exercicio_original_id uuid REFERENCES public.exercicios_avancados(id),
  card_original_id uuid,
  nome text NOT NULL,
  grupo_muscular text NOT NULL,
  series numeric NOT NULL,
  repeticoes text,
  ordem integer NOT NULL,
  oculto boolean NOT NULL DEFAULT false,
  concluido boolean NOT NULL DEFAULT false,
  peso numeric,
  observacao text,
  rer text DEFAULT 'do_microciclo',
  metodo_especial text,
  modelo_feedback text DEFAULT 'ARA/ART',
  substituicao_neste_treino boolean NOT NULL DEFAULT false,
  substituto_oficial_id uuid,
  substituto_custom_id uuid,
  substituto_nome text,
  incremento_minimo numeric,
  configuracao_inicial boolean DEFAULT false,
  avaliacao_pump numeric,
  avaliacao_fadiga numeric,
  avaliacao_dor numeric,
  avaliacao_recuperacao numeric,
  avaliacao_performance numeric,
  data_avaliacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercicios_treino_usuario_avancado ENABLE ROW LEVEL SECURITY;

-- RLS: Desenvolvedores podem tudo
CREATE POLICY "Desenvolvedores podem gerenciar exercícios avançados de usuários"
ON public.exercicios_treino_usuario_avancado
FOR ALL
TO authenticated
USING (
  (auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid) 
  OR ((auth.jwt() ->> 'email'::text) = 'arthurtaube.com.br@gmail.com'::text)
);

-- RLS: Usuários podem ver seus próprios exercícios
CREATE POLICY "Usuários podem ver seus exercícios avançados"
ON public.exercicios_treino_usuario_avancado
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM treinos_usuario tu
    JOIN programas_usuario pu ON tu.programa_usuario_id = pu.id
    WHERE tu.id = exercicios_treino_usuario_avancado.treino_usuario_id
      AND pu.usuario_id = auth.uid()
  )
);

-- RLS: Usuários podem inserir exercícios em seus treinos
CREATE POLICY "Usuários podem inserir exercícios avançados"
ON public.exercicios_treino_usuario_avancado
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM treinos_usuario tu
    JOIN programas_usuario pu ON tu.programa_usuario_id = pu.id
    WHERE tu.id = exercicios_treino_usuario_avancado.treino_usuario_id
      AND pu.usuario_id = auth.uid()
  )
);

-- RLS: Usuários podem atualizar seus exercícios
CREATE POLICY "Usuários podem atualizar exercícios avançados"
ON public.exercicios_treino_usuario_avancado
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM treinos_usuario tu
    JOIN programas_usuario pu ON tu.programa_usuario_id = pu.id
    WHERE tu.id = exercicios_treino_usuario_avancado.treino_usuario_id
      AND pu.usuario_id = auth.uid()
  )
);
