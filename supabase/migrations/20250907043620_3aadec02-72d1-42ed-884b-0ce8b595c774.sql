
-- 1) Tabela de exercícios customizados, enxuta e privada por usuário
CREATE TABLE IF NOT EXISTS public.exercicios_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  grupo_muscular text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.exercicios_custom ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuário acessa apenas os próprios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'exercicios_custom' AND policyname = 'Users can view their own custom exercises'
  ) THEN
    CREATE POLICY "Users can view their own custom exercises"
      ON public.exercicios_custom FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'exercicios_custom' AND policyname = 'Users can insert their own custom exercises'
  ) THEN
    CREATE POLICY "Users can insert their own custom exercises"
      ON public.exercicios_custom FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'exercicios_custom' AND policyname = 'Users can update their own custom exercises'
  ) THEN
    CREATE POLICY "Users can update their own custom exercises"
      ON public.exercicios_custom FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'exercicios_custom' AND policyname = 'Users can delete their own custom exercises'
  ) THEN
    CREATE POLICY "Users can delete their own custom exercises"
      ON public.exercicios_custom FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Opcional: impedir duplicata por usuário (remova esta UNIQUE se quiser permitir duplicatas para o mesmo usuário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'exercicios_custom' AND indexname = 'uniq_exercicios_custom_user_nome_grupo'
  ) THEN
    CREATE UNIQUE INDEX uniq_exercicios_custom_user_nome_grupo
      ON public.exercicios_custom (user_id, nome, grupo_muscular);
  END IF;
END
$$;

-- 2) Campos para “substituir exercício neste treino” em exercicios_treino_usuario
ALTER TABLE public.exercicios_treino_usuario
  ADD COLUMN IF NOT EXISTS substituicao_neste_treino boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS substituto_oficial_id uuid NULL,
  ADD COLUMN IF NOT EXISTS substituto_custom_id uuid NULL,
  ADD COLUMN IF NOT EXISTS substituto_nome text NULL;

-- FKs opcionais (não referenciamos auth.users; aqui referenciamos catálogos internos)
DO $$
BEGIN
  -- FK para exercicio oficial (exercicios_iniciantes)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ex_tu_subst_oficial_fk'
  ) THEN
    ALTER TABLE public.exercicios_treino_usuario
      ADD CONSTRAINT ex_tu_subst_oficial_fk
      FOREIGN KEY (substituto_oficial_id)
      REFERENCES public.exercicios_iniciantes (id)
      ON DELETE SET NULL;
  END IF;

  -- FK para exercicio custom
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ex_tu_subst_custom_fk'
  ) THEN
    ALTER TABLE public.exercicios_treino_usuario
      ADD CONSTRAINT ex_tu_subst_custom_fk
      FOREIGN KEY (substituto_custom_id)
      REFERENCES public.exercicios_custom (id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- Consistência mínima: se marcou substituicao_neste_treino, precisa registrar pelo menos um identificador (id oficial, id custom ou nome).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ex_tu_subst_presence_ck'
  ) THEN
    ALTER TABLE public.exercicios_treino_usuario
      ADD CONSTRAINT ex_tu_subst_presence_ck
      CHECK (
        substituicao_neste_treino = false
        OR (substituto_oficial_id IS NOT NULL OR substituto_custom_id IS NOT NULL OR substituto_nome IS NOT NULL)
      );
  END IF;
END
$$;
