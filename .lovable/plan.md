

## Programas Privados: Sistema de Permissões

### Resumo

Adicionar ao catálogo de programas a possibilidade de marcar programas como privados, visíveis apenas para usuários específicos. A funcionalidade será acessível via menu de opções do programa (apenas para dev/admin).

### 1. Migração de Banco de Dados

**Tabela `programas`** -- adicionar coluna:
- `privado` (boolean, default `false`)

**Nova tabela `programa_permissoes`**:
- `id` (uuid, PK)
- `programa_id` (uuid, FK -> programas.id, ON DELETE CASCADE)
- `user_id` (uuid, FK -> auth.users.id, ON DELETE CASCADE)
- `created_at` (timestamptz)
- Unique constraint em (programa_id, user_id)

**RLS em `programa_permissoes`**:
- SELECT/INSERT/UPDATE/DELETE: apenas dev/admin (mesma lógica das outras tabelas de catálogo)

**Atualizar RLS de `programas`** (SELECT): programas públicos (`privado = false`) visíveis para todos autenticados; programas privados visíveis apenas para usuários listados em `programa_permissoes` OU para o dev/admin. Substituir a policy SELECT atual por:

```sql
CREATE POLICY "Usuários podem ver programas permitidos" ON programas
FOR SELECT TO authenticated
USING (
  privado = false
  OR auth.uid() = 'a2eba955-...'::uuid
  OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
  OR EXISTS (
    SELECT 1 FROM programa_permissoes
    WHERE programa_id = programas.id AND user_id = auth.uid()
  )
);
```

### 2. Componente `PermissionsDialog`

Novo componente `src/components/programs/PermissionsDialog.tsx`:

- **Props**: `programId`, `open`, `onOpenChange`
- **Estado**: carrega `privado` do programa e lista de usuários permitidos (join com profiles para nome/email)
- **UI**:
  - Switch "Programa Privado" (toggle `privado` na tabela `programas`)
  - Quando privado, exibe:
    - Campo de busca de usuários (digitar 3+ chars -> busca por email/nome via `auth.users` não é possível, então buscar em `profiles` pelo `full_name` + buscar email via uma edge function ou security definer function)
    - Lista dos usuários já permitidos com botão de remover
  - Botão Salvar

**Busca de usuários**: Como não podemos consultar `auth.users` pelo client, criaremos uma **função security definer** `search_users_by_email_or_name(search_term text)` que retorna `id, email, full_name` fazendo join de `auth.users` com `profiles`. Filtro com `ILIKE '%term%'` quando `length(term) >= 3`, limitado a 10 resultados. Apenas dev/admin pode chamar.

```sql
CREATE FUNCTION search_users_by_email_or_name(search_term text)
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
```

### 3. Alterações no `ProgramCatalogOptionsMenu`

- Adicionar prop `onManagePermissions`
- Novo `DropdownMenuItem` "Gerenciar permissões" com ícone `Shield` (lucide)
- Ao clicar, abre o `PermissionsDialog`

### 4. Alterações no `ProgramCatalog.tsx`

- Nenhuma alteração na query de fetch necessaria -- a RLS já filtrará automaticamente os programas privados para usuários sem permissão
- Passar `onManagePermissions` ao `ProgramCatalogOptionsMenu`
- Adicionar badge "Privado" nos cards de programas privados (visível apenas para dev)
- Incluir `privado` na interface `Program`

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar: coluna `privado`, tabela `programa_permissoes`, função `search_users_by_email_or_name`, RLS policies |
| `src/components/programs/PermissionsDialog.tsx` | Criar |
| `src/components/programs/ProgramCatalogOptionsMenu.tsx` | Editar (nova opção) |
| `src/pages/ProgramCatalog.tsx` | Editar (badge privado, interface) |
| `src/integrations/supabase/types.ts` | Auto-atualizado |

