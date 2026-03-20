

## Plano: Corrigir configuração de incremento mínimo no workout avançado

### Diagnóstico

O problema está no fluxo de fechamento do diálogo. No `ExerciseCardAdvanced.tsx`, o `handleSaveIncrement` chama `saveIncrementSetting` mas **não fecha o diálogo** após o salvamento. A função `saveIncrementSetting` em `useExerciseStateAdvanced.ts` salva corretamente na tabela `exercicios_treino_usuario_avancado`, mas não chama `setShowIncrementDialog(false)`.

No sistema iniciante, o `useExerciseFeedback` gerencia o estado do diálogo internamente e fecha após salvar. No avançado, essa responsabilidade ficou sem dono.

### Correção

**1. `ExerciseCardAdvanced.tsx`** — Fechar o diálogo após salvar:
```typescript
const handleSaveIncrement = async (value: number) => {
    await saveIncrementSetting(value);
    setShowIncrementDialog(false);
};
```

**2. `useExerciseStateAdvanced.ts`** — Adicionar toast de confirmação e lógica de rounding de peso (consistente com o sistema iniciante):
- Após salvar o incremento, se o exercício já tem peso, arredondar o peso para o múltiplo mais próximo do incremento
- Exibir toast "Incremento salvo com sucesso"

Nota: O `FeedbackDialog` existente funciona perfeitamente para ambos os níveis — o problema era apenas no wiring do estado. Não há necessidade de criar um diálogo separado.

### Sobre "avançado = intermediário + avançado"

Entendido. Ajustarei a detecção em `Workout.tsx` para tratar `nivel !== 'iniciante'` (que é como já está implementado na linha 92: `const advanced = programLevel !== 'iniciante'`). Portanto, intermediário já segue o fluxo avançado corretamente.

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/workout/ExerciseCardAdvanced.tsx` | Fechar diálogo após salvar incremento |
| `src/components/workout/hooks/useExerciseStateAdvanced.ts` | Adicionar toast + rounding de peso consistente |

