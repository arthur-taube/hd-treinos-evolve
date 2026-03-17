
-- 1. Nova tabela exercicios_treino_avancado
CREATE TABLE public.exercicios_treino_avancado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_id uuid NOT NULL REFERENCES public.treinos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  grupo_muscular text NOT NULL,
  series integer NOT NULL,
  repeticoes text,
  ordem integer NOT NULL,
  oculto boolean NOT NULL DEFAULT false,
  exercicio_original_id uuid REFERENCES public.exercicios_avancados(id),
  allow_multiple_groups boolean DEFAULT false,
  available_groups text[],
  rer text DEFAULT 'do_microciclo',
  metodo_especial text,
  modelo_feedback text DEFAULT 'ARA/ART',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercicios_treino_avancado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Desenvolvedores podem gerenciar exercícios avançados"
ON public.exercicios_treino_avancado
FOR ALL
TO authenticated
USING (
  (auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid) 
  OR ((auth.jwt() ->> 'email'::text) = 'arthurtaube.com.br@gmail.com'::text)
);

CREATE POLICY "Usuários autenticados podem ver exercícios avançados de treino"
ON public.exercicios_treino_avancado
FOR SELECT
TO authenticated
USING (true);

-- 2. Tabela metodos_especiais (catálogo)
CREATE TABLE public.metodos_especiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metodos_especiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver métodos especiais"
ON public.metodos_especiais
FOR SELECT
TO authenticated
USING (true);

-- 3. Coluna rer_por_semana em mesociclos
ALTER TABLE public.mesociclos ADD COLUMN rer_por_semana jsonb;
