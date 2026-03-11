

## Editor Avançado: ExerciseKanbanAdvanced Separado + DB

### Abordagem

Criar componentes completamente separados para o Kanban avançado, mantendo o iniciante intocado. O único arquivo existente modificado será `ProgramExercisesForm.tsx` (condicional de renderização) e `createMesocyclesAndWorkouts` (buscar exercício na tabela correta).

### 1. Migração de Banco de Dados

**ALTER `exercicios_avancados`** -- adicionar colunas faltantes:
- `grande_grupo` (text, nullable)
- `primary_muscle` (text, nullable)
- `secondary_muscle` (text, nullable)
- `tertiary_muscle` (text, nullable)
- `quaternary_muscle` (text, nullable)

**CREATE `faixas_repeticoes_avancado`**:
- `id` uuid PK, `min_reps` int, `max_reps` int, `created_at` timestamptz
- Sem coluna `tipo`
- INSERT: 5-10, 6-12, 10-15, 10-20, 15-20, 20-30
- RLS: SELECT público

**CREATE FUNCTION `get_distinct_muscle_groups_avancado()`**:
- Retorna grupos musculares distintos de `exercicios_avancados`

### 2. Novos Componentes (sem alterar nenhum existente)

| Novo Componente | Baseado em | Diferenças |
|---|---|---|
| `ExerciseKanbanAdvanced.tsx` | `ExerciseKanban.tsx` | Usa `MuscleGroupDialogAdvanced`, `DayColumnAdvanced` |
| `DayColumnAdvanced.tsx` | `DayColumn.tsx` | Usa `ExerciseCardAdvanced` |
| `ExerciseCardAdvanced.tsx` | `ExerciseCard.tsx` | Busca de `exercicios_avancados` (campo text, usa `.eq()` em vez de `.overlaps()`), faixas de `faixas_repeticoes_avancado` |
| `MuscleGroupDialogAdvanced.tsx` | `MuscleGroupDialog.tsx` | Chama RPC `get_distinct_muscle_groups_avancado` |
| `ExerciseDetailsAdvanced.tsx` | `ExerciseDetails.tsx` | Idêntico por enquanto (campos RER, métodos especiais serão adicionados depois) |

Os tipos `Exercise` e `RepsRange` existentes são reutilizados sem alteração (o campo `tipo` em `RepsRange` simplesmente não será usado no avançado).

### 3. Alteração em Arquivo Existente

**`ProgramExercisesForm.tsx`** -- duas mudanças:

1. Condicional de renderização do Kanban:
```tsx
{programLevel === 'iniciante' 
  ? <ExerciseKanban ... /> 
  : <ExerciseKanbanAdvanced ... />}
```

2. Em `createMesocyclesAndWorkouts`, buscar `exercicio_original_id` na tabela correta:
```tsx
const exerciseTable = programLevel === 'iniciante' 
  ? 'exercicios_iniciantes' 
  : 'exercicios_avancados';
```

### 4. Estrutura de Arquivos

```text
src/components/programs/ProgramEditor/
├── ExerciseKanban.tsx              (inalterado)
├── ExerciseKanbanAdvanced.tsx      (novo)
├── DayColumn.tsx                   (inalterado)
├── DayColumnAdvanced.tsx           (novo)
├── ExerciseCard.tsx                (inalterado)
├── ExerciseCardAdvanced.tsx        (novo)
├── MuscleGroupDialog.tsx           (inalterado)
├── MuscleGroupDialogAdvanced.tsx   (novo)
├── components/
│   ├── ExerciseDetails.tsx         (inalterado)
│   ├── ExerciseDetailsAdvanced.tsx (novo)
│   ├── ExerciseNameSelect.tsx      (reutilizado por ambos)
│   └── ExerciseHeader.tsx          (reutilizado por ambos)
├── hooks/                          (reutilizados por ambos)
└── types.ts                        (inalterado)
```

Isso garante zero risco de quebrar o Kanban iniciante e dá liberdade total para evoluir o avançado (RER, métodos especiais, feedback) sem condicionalidades complexas.

