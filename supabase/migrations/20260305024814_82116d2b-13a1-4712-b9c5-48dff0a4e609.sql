
-- 1. Add privado column to programas
ALTER TABLE public.programas ADD COLUMN privado boolean NOT NULL DEFAULT false;

-- 2. Create programa_permissoes table
CREATE TABLE public.programa_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id uuid NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programa_id, user_id)
);

-- 3. Enable RLS on programa_permissoes
ALTER TABLE public.programa_permissoes ENABLE ROW LEVEL SECURITY;

-- 4. RLS for programa_permissoes (dev/admin only)
CREATE POLICY "Desenvolvedores podem gerenciar permissoes" ON public.programa_permissoes
FOR ALL TO authenticated
USING (
  auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid
  OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
)
WITH CHECK (
  auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid
  OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
);

-- 5. Drop old SELECT policy on programas and create new one
DROP POLICY IF EXISTS "Usuários autenticados podem ver programas" ON public.programas;

CREATE POLICY "Usuários podem ver programas permitidos" ON public.programas
FOR SELECT TO authenticated
USING (
  privado = false
  OR auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid
  OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
  OR EXISTS (
    SELECT 1 FROM public.programa_permissoes
    WHERE programa_id = programas.id AND user_id = auth.uid()
  )
);

-- 6. Add DELETE policy for programas (dev only, needed for delete functionality)
CREATE POLICY "Desenvolvedores podem excluir programas" ON public.programas
FOR DELETE TO authenticated
USING (
  auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid
  OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
);

-- 7. Search function for users
CREATE OR REPLACE FUNCTION public.search_users_by_email_or_name(search_term text)
RETURNS TABLE(id uuid, email text, full_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (
    auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid
    OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT u.id, u.email::text, p.full_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE length(search_term) >= 3
    AND (u.email ILIKE '%' || search_term || '%'
         OR p.full_name ILIKE '%' || search_term || '%')
  LIMIT 10;
END;
$$;
