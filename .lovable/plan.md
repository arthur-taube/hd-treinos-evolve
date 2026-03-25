

## Plano: AMP — Avaliação de Manutenção da Performance

### Conceito

Dialog pós-exercício (igual à ARA) que aparece quando `modelo_feedback` inclui `'AMP'` (e não `'ARA'`). Usa o mesmo padrão visual do `FeedbackDialog` existente (opções toggle + legenda ao selecionar).

### Valores

- **Perdi, muito fofo!** = +1 — "Eu notei perda de força e performance nesse exercício, provavelmente devido a uma falta de treino, pois minha recuperação está ótima."
- **Mantive/Ganhei** = 0 — "Eu mantive ou aumentei minha força/performance nesse exercício."
- **Perdi, estou exausto!** = -1 — "Eu notei perda de força/performance nesse exercício e estou sentindo dificuldade na recuperação (treino excessivo)."

Cálculo: `séries_próxima_semana = séries_atuais + AMP`, mesmo rounding (≤.5→floor, ≥.51→ceil).

### Implementação

**1. `ExerciseCardAdvanced.tsx`** — No `handleCompleteWithFeedback`:
- Se `feedbackModel` inclui `'ARA'` → abre ARA dialog (já existe)
- Se `feedbackModel` inclui `'AMP'` → abre AMP dialog (novo estado `showAMPDialog`)
- Senão → fecha direto

Nova função `handleAMPSubmit(value: number)` que chama `saveAMPFeedback` do hook de actions e fecha o dialog.

**2. `useExerciseActionsAdvanced.ts`** — Nova função `saveAMPFeedback(ampValue: number)`:
- Update `avaliacao_performance = ampValue` e `data_avaliacao` no exercício atual
- Buscar `series` atual, calcular `newSeries = series + ampValue` (rounding)
- Encontrar próxima instância (mesma lógica de 3 fallbacks: `card_original_id` → `exercicio_original_id` → `substituto_custom_id`) e atualizar séries
- Toast de confirmação

**3. Reutilizar `FeedbackDialog` existente** — Não precisa de componente novo. O `FeedbackDialog` já suporta opções toggle com legenda. Basta passar as 3 opções AMP como props.

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/workout/ExerciseCardAdvanced.tsx` | Estado `showAMPDialog`, branch no `handleCompleteWithFeedback`, render do `FeedbackDialog` para AMP |
| `src/components/workout/hooks/useExerciseActionsAdvanced.ts` | Nova função `saveAMPFeedback` com cálculo e update da próxima semana |

