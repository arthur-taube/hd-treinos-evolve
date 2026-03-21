

## Plano: Usar progressão Epley como placeholder na inicialização dos sets

### Problema
Os sets são inicializados em `useExerciseStateAdvanced` com `defaultReps = min da faixa` (useEffect síncrono). O cálculo Epley é assíncrono e roda em `ExerciseCardAdvanced`, mas seus resultados nunca atualizam o estado dos sets.

### Solução
Adicionar um `useEffect` em `ExerciseCardAdvanced.tsx` que, quando `epleyResult` chega (e os sets ainda não foram preenchidos pelo usuário), atualiza os placeholders de carga e reps dos sets não completados com `suggestedWeight` e `suggestedReps`.

### Alteração: `ExerciseCardAdvanced.tsx`

Novo useEffect após o cálculo de `suggestedWeight`/`suggestedReps`:

```typescript
useEffect(() => {
  if (!epleyResult) return;
  setSets(prev => prev.map(set => {
    if (set.completed) return set;
    // Only update if user hasn't manually changed values
    const isDefaultWeight = set.weight === null;
    const isDefaultReps = set.reps === null || set.reps === defaultMinReps;
    return {
      ...set,
      weight: isDefaultWeight ? epleyResult.suggestedWeight : set.weight,
      reps: isDefaultReps ? epleyResult.suggestedReps : set.reps,
    };
  }));
}, [epleyResult]);
```

Onde `defaultMinReps` é o min da faixa de reps (o valor que foi usado na inicialização).

### Arquivo alterado
- `src/components/workout/ExerciseCardAdvanced.tsx` — 1 useEffect adicionado

