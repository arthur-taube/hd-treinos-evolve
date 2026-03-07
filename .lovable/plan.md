

## Correção: Dois Problemas (Permissões + Fallback com substituto_custom_id)

### Problema 1: Programas privados não visíveis para usuários permitidos

**Causa**: A tabela `programa_permissoes` só tem RLS para dev/admin. Quando um usuário comum executa SELECT em `programas`, a subconsulta `EXISTS (SELECT 1 FROM programa_permissoes ...)` sempre retorna false.

**Solução**: Migração SQL adicionando policy SELECT em `programa_permissoes` para `user_id = auth.uid()`.

### Problema 2: Fallback completo com substituto_custom_id

Você tem razão -- exercícios custom sem `card_original_id` NEM `exercicio_original_id` ficam sem identificador. O `substituto_custom_id` deve ser o terceiro fallback.

**Cadeia de fallback correta**: `card_original_id` → `exercicio_original_id` → `substituto_custom_id`

**Arquivos a modificar**:

| Arquivo | Mudança |
|---|---|
| Migração SQL | Policy SELECT em `programa_permissoes` para usuários verem suas próprias permissões |
| `usePreviousSeries.ts` | Aceitar `substitutoCustomId` como 3o param; usar como fallback nas queries |
| `useExerciseState.ts` | Adicionar `substituto_custom_id` como 3o fallback no `checkIsFirstWeek` |
| `useExerciseActions.ts` | Adicionar `substituto_custom_id` como 3o fallback na replicação de observações |
| `ExerciseCard.tsx` | Passar `exercise.substituto_custom_id` ao `usePreviousSeries` |

**Lógica do fallback** (aplicada em todos os pontos):
```typescript
if (cardOriginalId) {
  query = query.eq('card_original_id', cardOriginalId);
} else if (exercicioOriginalId) {
  query = query.eq('exercicio_original_id', exercicioOriginalId);
} else if (substitutoCustomId) {
  query = query.eq('substituto_custom_id', substitutoCustomId);
} else {
  // Sem identificador - assume first week / retorna vazio
}
```

O `nextWorkoutProgression.ts` já usa `substituto_custom_id` como fallback, então não precisa de alteração.

