

## Correção: Atualizar peso no frontend após redefinição de incremento

### Problema
Ao salvar o novo incremento mínimo, o peso é ajustado corretamente na DB, mas o estado local (`exercicios` em `Workout.tsx`) não é atualizado, exigindo reload manual.

### Solução
A forma mais simples e segura: fazer `saveIncrementSetting` retornar o peso ajustado, e usar o callback `onWeightUpdate` que já existe para atualizar o estado local.

### Alterações

**1. `src/hooks/use-exercise-feedback.ts`** — `saveIncrementSetting` retorna o peso ajustado (ou `null` se não mudou):
```typescript
const saveIncrementSetting = async (increment: number): Promise<number | null> => {
  // ... lógica existente ...
  if (roundedWeight !== currentExercise.peso) {
    updateData.peso = roundedWeight;
    // após update no DB, retorna o novo peso
    return roundedWeight;
  }
  return null;
};
```

**2. `src/components/workout/hooks/useExerciseState.ts`** — `customSaveIncrementSetting` repassa o retorno:
```typescript
const customSaveIncrementSetting = async (value: number): Promise<number | null> => {
  const result = await feedbackHook.saveIncrementSetting(value);
  setIncrementDialogShown(true);
  return result;
};
```

**3. `src/components/workout/hooks/useExerciseActions.ts`** — `handleSaveIncrementSetting` chama `onWeightUpdate` se houve ajuste:
```typescript
const handleSaveIncrementSetting = async (value, saveIncrementSetting) => {
  const adjustedWeight = await saveIncrementSetting(value);
  if (adjustedWeight !== null) {
    onWeightUpdate(exercise.id, adjustedWeight);
  }
};
```

Isso usa `onWeightUpdate` (`updateExerciseWeight` em `Workout.tsx`) que já faz `setExercicios(prev => prev.map(...))`, atualizando o estado local sem reload. A chamada ao DB em `onWeightUpdate` será redundante (peso já salvo), mas inofensiva.

### Arquivos alterados
- `src/hooks/use-exercise-feedback.ts`
- `src/components/workout/hooks/useExerciseState.ts`
- `src/components/workout/hooks/useExerciseActions.ts`

Sem migrations. Sem reload de página. Configuração inicial de incremento (primeira vez) não é afetada pois o peso normalmente é `null` nesse caso.

