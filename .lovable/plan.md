

## Plano: Ajuste de séries via ARA + correção de legendas

### 1. Atualizar legendas no `ARAFeedbackDialog.tsx`

Adicionar "(inchaço muscular)" nas descrições de Pump:
- `"Eu não tive nenhum pump (inchaço muscular) com esse exercício."`
- `"Eu tive um pump (inchaço muscular) perceptível com esse exercício."`

### 2. Adicionar lógica de ajuste de séries no `saveARAFeedback`

No `useExerciseActionsAdvanced.ts`, após salvar pump/fadiga:

1. Buscar o exercício atual para obter `series`, `card_original_id`, `exercicio_original_id`, `treino_usuario_id`
2. Via join, obter `programa_usuario_id`
3. Calcular `newSeries = currentSeries + pumpValue + fadigaValue`, arredondando: `≤ .5 → floor`, `≥ .51 → ceil`
4. Encontrar a próxima instância do mesmo exercício (não concluída, próxima semana) em `exercicios_treino_usuario_avancado`, usando `card_original_id` (preferencial) ou `exercicio_original_id` (fallback)
5. Atualizar `series` dessa próxima instância

Lógica de busca da próxima instância: mesmo padrão do beginner (`findNextExerciseInstance`), mas consultando `exercicios_treino_usuario_avancado`.

```typescript
// Rounding rule: ≤ .5 → floor, ≥ .51 → ceil
const rawSeries = currentSeries + pumpValue + fadigaValue;
const newSeries = (rawSeries % 1 > 0.5) ? Math.ceil(rawSeries) : Math.floor(rawSeries);
```

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/workout/ARAFeedbackDialog.tsx` | Legendas pump com "(inchaço muscular)" |
| `src/components/workout/hooks/useExerciseActionsAdvanced.ts` | `saveARAFeedback` atualiza séries da próxima semana |

