
CREATE POLICY "Desenvolvedores podem gerenciar métodos especiais"
ON public.metodos_especiais
FOR ALL
TO authenticated
USING (
  (auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid) 
  OR ((auth.jwt() ->> 'email'::text) = 'arthurtaube.com.br@gmail.com'::text)
);
