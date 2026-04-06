

## Plano: Filtrar exercícios AMP da detecção de ART

O problema: a lógica atual do `useARTCheck` considera **todos** os exercícios ao montar a lista de músculos e ao buscar candidatos pendentes de ART, incluindo os que usam modelo AMP. Como AMP é independente de ARA/ART, esses exercícios não devem participar do cruzamento muscular.

### Alteração em `src/hooks/useARTCheck.ts`

**1. Ampliar o tipo de `currentExercises` no parâmetro do hook**

Aceitar `modelo_feedback` além de `exercicio_original_id`:
```typescript
currentExercises: { exercicio_original_id: string | null; modelo_feedback?: string | null }[]
```

**2. Filtrar exercícios do workout atual (passo 1)**

Antes de coletar `originalIds`, filtrar apenas exercícios com `modelo_feedback !== 'AMP'` (ou seja, somente `ARA/ART` ou `null`/`undefined`):
```typescript
const araArtExercises = currentExercises.filter(e => e.modelo_feedback !== 'AMP');
const originalIds = araArtExercises.map(e => e.exercicio_original_id).filter(Boolean);
```

**3. Filtrar candidatos pendentes nos workouts anteriores (passo 4)**

Adicionar `.neq('modelo_feedback', 'AMP')` na query que busca exercícios com ARA feita mas ART pendente:
```typescript
.neq('modelo_feedback', 'AMP')
```

Isso garante que exercícios AMP não entrem como candidatos a ART, nem contribuam músculos para o cruzamento.

### Arquivo

| Arquivo | Alteração |
|---|---|
| `src/hooks/useARTCheck.ts` | Filtrar AMP em ambos os lados do cruzamento |

