

## Plano: Proteção de rotas + redirecionamento inteligente na Index

### Problema atual

1. **Sem proteção**: `AppLayout` não verifica autenticação — qualquer rota é acessível sem login
2. **Index fixa**: `/` sempre redireciona para `/auth`, mesmo para usuários já logados
3. **Auth acessível logado**: usuários autenticados podem voltar para `/auth` manualmente

### Solução

**1. Criar componente `ProtectedRoute`**

Novo arquivo `src/components/auth/ProtectedRoute.tsx`:
- Usa `useAuth()` para verificar `user` e `loading`
- Se `loading`, exibe spinner/skeleton
- Se não autenticado, redireciona para `/auth`
- Se autenticado, renderiza `children`

**2. Atualizar `AppLayout`**

Envolver o conteúdo com `ProtectedRoute`, tornando todas as rotas que usam `AppLayout` automaticamente protegidas.

**3. Atualizar `Index` (`/`)**

Condicionar o redirecionamento:
- Autenticado → `/dashboard`
- Não autenticado → `/auth`
- Loading → spinner

**4. Proteger Auth (`/auth`)**

Se o usuário já estiver logado e acessar `/auth`, redirecionar para `/dashboard`.

### Arquivos

| Arquivo | Alteração |
|---|---|
| `src/components/auth/ProtectedRoute.tsx` | Novo componente |
| `src/components/layout/AppLayout.tsx` | Envolver com `ProtectedRoute` |
| `src/pages/Index.tsx` | Redirecionamento condicional |
| `src/pages/Auth.tsx` | Redirecionar logados para `/dashboard` |

