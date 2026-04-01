

## Plano: Substituição de exercícios no workout avançado

O problema tem 3 camadas: (1) `ExerciseCardAdvanced` não implementa a lógica de substituição, (2) o `ExerciseSubstitutionDialog` só consulta tabelas de iniciantes, e (3) as funções SQL `apply_temporary_substitution` e `replace_exercise_future_instances` operam apenas em `exercicios_treino_usuario`.

### 1. `ExerciseSubstitutionDialog.tsx` — Suporte a modo avançado

Adicionar prop opcional `isAdvanced?: boolean`. Quando `true`:
- Buscar exercícios de `exercicios_avancados` (via `overlaps('grupo_muscular', [grupo])`) em vez do RPC `get_available_exercises`
- Buscar faixas de repetições de `faixas_repeticoes_avancado` em vez de `faixas_repeticoes`
- Buscar grupos musculares distintos via `get_distinct_muscle_groups_avancado` em vez de `get_distinct_muscle_groups`
- Buscar `card_original_id` de `exercicios_treino_usuario_avancado` em vez de `exercicios_treino_usuario`
- Buscar `available_groups/allow_multiple_groups` de `exercicios_treino_avancado` em vez de `exercicios_treino`

### 2. `ExerciseCardAdvanced.tsx` — Implementar fluxo de substituição

Replicar a lógica do `ExerciseCard.tsx`:
- Adicionar estados `showSubstitutionDialog` e `substitutionType`
- Implementar `handleOpenSubstitution` e `handleSubstitutionConfirm`
- Renderizar `ExerciseSubstitutionDialog` com `isAdvanced={true}`
- Conectar `onSubstitutionRequest` no header (substituir o `() => {}`)

### 3. Novas funções SQL para tabela avançada

Criar duas funções equivalentes às existentes, operando em `exercicios_treino_usuario_avancado`:

- **`apply_temporary_substitution_advanced`**: Mesma lógica de `apply_temporary_substitution`, mas atualizando `exercicios_treino_usuario_avancado`
- **`replace_exercise_future_instances_advanced`**: Mesma lógica de `replace_exercise_future_instances`, mas operando em `exercicios_treino_usuario_avancado` e preservando campos avançados (`rer`, `metodo_especial`, `modelo_feedback`)

### 4. `handleSubstitutionConfirm` no `ExerciseCardAdvanced`

Chamar as RPCs `_advanced` em vez das originais.

### Arquivos

| Arquivo | Alteração |
|---|---|
| Migration (novas funções SQL) | Novo |
| `src/components/workout/ExerciseSubstitutionDialog.tsx` | Prop `isAdvanced`, queries condicionais |
| `src/components/workout/ExerciseCardAdvanced.tsx` | Estado + lógica de substituição + dialog |

