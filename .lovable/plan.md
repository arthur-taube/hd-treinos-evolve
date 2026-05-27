## Plano: Arredondar séries decimais + faixa do Select por contexto

### Problemas

1. `loadUserProgramForCustomize` retorna `series` decimais (ex.: 4.75) que não casam com nenhuma opção do Select e aparecem em branco no editor.
2. O Select está fixo em 1–5. Na edição do programa ativo precisamos ir até 10; na criação e na customização inicial deve continuar 1–5.

### Solução

**1. Arredondar no carregamento (`src/utils/programLoader.ts`)**
Importar `roundSetsForDisplay` e aplicar em `sets: roundSetsForDisplay(exercicio.series)` nos dois pontos de mapeamento (linhas ~179 e ~399). Banco continua guardando o decimal real; apenas o valor exibido no editor é arredondado (≤ .5 desce, > .5 sobe).

**2. Propagar `maxSets` até o Select**
Hoje `maxSets` já existe em `ExerciseKanban` / `ExerciseKanbanAdvanced` / `DayColumn(Advanced)` mas não chega ao `ExerciseDetails(Advanced)`. Plumbar:

- `DayColumn.tsx` / `DayColumnAdvanced.tsx` → passar `maxSets` para `ExerciseCard` / `ExerciseCardAdvanced`.
- `ExerciseCard.tsx` / `ExerciseCardAdvanced.tsx` → aceitar `maxSets` e repassar para `ExerciseDetails` / `ExerciseDetailsAdvanced`.
- `ExerciseDetails.tsx` / `ExerciseDetailsAdvanced.tsx` → aceitar `maxSets` (default 5) e gerar o array do Select como `Array.from({ length: maxSets }, (_, i) => i + 1)` no lugar do `[1, 2, 3, 4, 5]` hardcoded.

**3. Definir `maxSets` por contexto**


| Contexto                          | Arquivo                           | maxSets avançado     | maxSets iniciante   |
| --------------------------------- | --------------------------------- | -------------------- | ------------------- |
| Criação do programa (admin)       | (já usa default 5 do `DayColumn`) | 5                    | 5                   |
| Customização inicial pelo usuário | `src/pages/ProgramCustomize.tsx`  | 5 (mantém)           | 3 (mantém)          |
| Edição do programa ativo          | `src/pages/ProgramUserEdit.tsx`   | **10** (trocar de 5) | **6** (trocar de 3) |


### Arquivos

- `src/utils/programLoader.ts` — aplicar `roundSetsForDisplay` em `sets`.
- `src/components/programs/ProgramEditor/DayColumn.tsx` e `DayColumnAdvanced.tsx` — passar `maxSets` adiante.
- `src/components/programs/ProgramEditor/ExerciseCard.tsx` e `ExerciseCardAdvanced.tsx` — aceitar e repassar `maxSets`.
- `src/components/programs/ProgramEditor/components/ExerciseDetails.tsx` e `ExerciseDetailsAdvanced.tsx` — gerar opções do Select a partir de `maxSets`.
- `src/pages/ProgramUserEdit.tsx` — `maxSets={10}` no Kanban Avançado e {6} no Iniciante.