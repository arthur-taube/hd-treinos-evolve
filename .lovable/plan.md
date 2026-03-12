

## Correção: Grupos Musculares Avançados (Array)

### Problema

O campo `grupo_muscular` em `exercicios_avancados` é um array (`text[]`), igual ao `exercicios_iniciantes`. Mas o sistema avançado foi implementado tratando-o como text simples:

1. **RPC `get_distinct_muscle_groups_avancado`** faz `SELECT DISTINCT ea.grupo_muscular` sem `unnest()` -- retorna arrays brutos como `["Abdominais"]`, `["Bíceps","Antebraços"]` em vez de nomes individuais
2. **`ExerciseCardAdvanced`** usa `.eq('grupo_muscular', ...)` em vez de `.overlaps()` -- nunca encontra exercícios

### Correções

| Alvo | Mudança |
|---|---|
| Migration SQL | DROP e recria `get_distinct_muscle_groups_avancado` com `unnest()`, idêntico ao padrão do iniciante |
| `ExerciseCardAdvanced.tsx` | Trocar `.eq()` por `.overlaps('grupo_muscular', [exercise.muscleGroup])` |

**RPC corrigida:**
```sql
SELECT DISTINCT unnest(ea.grupo_muscular)::text
FROM public.exercicios_avancados ea
ORDER BY 1;
```

**Query corrigida no ExerciseCardAdvanced:**
```typescript
.overlaps('grupo_muscular', [exercise.muscleGroup])
```

Duas alterações pontuais. Zero impacto no sistema iniciante.

