CREATE POLICY "Usuários podem ver suas próprias permissões"
ON public.programa_permissoes
FOR SELECT TO authenticated
USING (user_id = auth.uid());