

## Plano: Progressão Epley matricial com múltiplas sugestões (revisado)

### Lógica do cálculo (`useEpleyProgression.ts`)

1. Buscar carga e reps da 1ª série do treino anterior
2. Calcular 1RMe base: `prevWeight × (1 + prevReps/30)`
3. Gerar matriz de candidatos: cargas (`prevWeight`, `prevWeight + increment`) × reps (`minReps` a `maxReps`), excluindo combinação idêntica à base
4. Para cada par, calcular 1RMe e % de aumento vs base

**Filtro (revisado):**
- Buscar candidatos na **faixa ideal (2-5%)**
- Se **0 candidatos ideais** → ampliar para **faixa estendida (1-6.5%)**
- Nunca misturar: ou usa ideal, ou usa estendida

**Seleção e rotulação (revisado):**
- Antes de rotular, remover candidatos redundantes: se 2+ candidatos têm menos de 1 p.p. de diferença entre si, manter apenas o mais próximo da faixa ideal (centro = 3.5%)
- Após filtragem de redundância:
  - 1 opção → `"ideal"`
  - 2 opções → `"mais fácil"` + `"mais difícil"`
  - 3+ opções → pegar extremos + mediana → `"mais fácil"` + `"intermediário"` + `"mais difícil"`

**Placeholder da 1ª série (revisado):**
- Se existe opção rotulada `"ideal"` → usa ela
- Senão → usa a opção mais próxima do centro da faixa ideal (3.5%)
- Se empate de distância → usa a "mais fácil"

### Interface de retorno

```typescript
interface EpleyOption {
  weight: number;
  reps: number;
  estimated1RM: number;
  percentIncrease: number;
  label: 'mais fácil' | 'intermediário' | 'ideal' | 'mais difícil';
}

interface EpleyResult {
  base: { weight: number; reps: number; estimated1RM: number };
  options: EpleyOption[];
  suggestedWeight: number;
  suggestedReps: number;
}
```

### UI no header (`ExerciseHeaderAdvanced.tsx`)

```text
Progressão sugerida: (base: 40kg x 9 reps – 1RMe = 52kg)
  40kg x 10 reps – 1RMe = 53,33kg (mais fácil – 2,56%)
  42kg x 9 reps – 1RMe = 54,6kg (mais difícil – 5,0%)
```

Linha de base em muted, opções em azul. Se 0 candidatos → "Sem progressão sugerida".

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useEpleyProgression.ts` | Reescrever: matriz, filtro ideal→estendido, redundância <1pp, rotulação, placeholder por proximidade a 3.5% |
| `src/components/workout/components/ExerciseHeaderAdvanced.tsx` | Multilinha com base + opções rotuladas |
| `src/components/workout/ExerciseCardAdvanced.tsx` | Consumir novo formato (minor) |

