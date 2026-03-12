

## Correção: Exercícios não listados no editor avançado

### Diagnóstico

- A query `.overlaps('grupo_muscular', ['Dorsais'])` retorna 0 resultados no frontend, mas a mesma query via service role retorna dados corretamente.
- Os dados estão corretos (tipo `text[]`, sem espaços, sem caracteres invisíveis).
- A política RLS em `exercicios_avancados` foi criada sem cláusula `USING` explícita, o que pode estar bloqueando todas as linhas.

### Correção

**Migration SQL**: Recriar a política SELECT com `USING (true)` explícito:

```sql
DROP POLICY IF EXISTS "Usuários autenticados podem ver exercícios avançados" 
  ON public.exercicios_avancados;

CREATE POLICY "Usuários autenticados podem ver exercícios avançados"
  ON public.exercicios_avancados
  FOR SELECT
  TO authenticated
  USING (true);
```

Uma única alteração de banco. Zero mudanças no frontend.

