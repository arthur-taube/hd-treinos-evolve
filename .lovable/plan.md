

## Arredondamento direcional ao redefinir incremento

### Regra
- **Novo incremento > antigo**: `Math.ceil(peso / increment) * increment` (arredonda para cima, preserva progresso)
- **Novo incremento ≤ antigo**: `Math.round(peso / increment) * increment` (comportamento atual)

### Alteração única: `src/hooks/use-exercise-feedback.ts`

Na query da linha 199, adicionar `incremento_minimo` ao `select`:
```typescript
.select('peso, incremento_minimo')
```

Na lógica de arredondamento (linha 215), trocar de `Math.round` fixo para condicional:
```typescript
const oldIncrement = currentExercise.incremento_minimo;
const roundFn = (oldIncrement != null && increment > oldIncrement) ? Math.ceil : Math.round;
const adjustedWeight = roundFn(currentExercise.peso / increment) * increment;
```

### Arquivo alterado
- `src/hooks/use-exercise-feedback.ts` — 2 linhas modificadas

