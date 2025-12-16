-- Create RLS policy to allow users to delete their own programs
CREATE POLICY "Usuários podem excluir seus próprios programas"
ON programas_usuario
FOR DELETE
USING (auth.uid() = usuario_id);