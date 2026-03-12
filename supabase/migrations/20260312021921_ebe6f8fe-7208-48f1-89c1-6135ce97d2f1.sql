
DROP POLICY IF EXISTS "Usuários autenticados podem ver exercícios avançados" 
  ON public.exercicios_avancados;

CREATE POLICY "Usuários autenticados podem ver exercícios avançados"
  ON public.exercicios_avancados
  FOR SELECT
  TO authenticated
  USING (true);
