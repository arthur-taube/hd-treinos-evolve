

## Adicionar `card_original_id` para Vinculacao Permanente com Template

### Problema
Exercicios custom que foram reordenados ou substituidos perdem a vinculacao com o card original do template (`exercicios_treino`). Isso impede recuperar `allow_multiple_groups` e `available_groups` na dialog de substituicao, e causa inconsistencias na replicacao de observacoes.

### Pontos afetados identificados
1. **`ExerciseSubstitutionDialog.fetchExerciseDetails`** (linha 91-96): busca por `exercicio_original_id` — null para custom
2. **`replace_exercise_future_instances` RPC**: match por `exercicio_original_id` + `ordem` — ambos podem estar incorretos para custom reordenados
3. **`useExerciseActions.saveObservation`** (linha 284): replica por `exercicio_original_id` — null para custom, nao replica
4. **`usePreviousSeries`** (linha 33, 66): busca historico por `exercicio_original_id` — null para custom
5. **`useExerciseState.checkIsFirstWeek`** (linha 143): busca por `exercicio_original_id` — null para custom
6. **`loadUserProgramForCustomize`** (linhas 302-305): matching template por `exercicio_original_id` — falha para custom

### Solucao

#### 1. Migracao SQL — coluna `card_original_id`
```sql
ALTER TABLE exercicios_treino_usuario 
ADD COLUMN card_original_id uuid REFERENCES exercicios_treino(id);

-- Preencher dados existentes: match por exercicio_original_id + treino_original_id
UPDATE exercicios_treino_usuario etu
SET card_original_id = et.id
FROM treinos_usuario tu, exercicios_treino et
WHERE etu.treino_usuario_id = tu.id
AND et.treino_id = tu.treino_original_id
AND et.exercicio_original_id = etu.exercicio_original_id
AND etu.exercicio_original_id IS NOT NULL
AND etu.card_original_id IS NULL;
```

#### 2. `src/utils/programCustomizer.ts` — `saveCustomizedProgram`
Ao inserir exercicios (linha 247-258), adicionar `card_original_id`. Precisamos buscar os `exercicios_treino` do treino original para fazer o matching. O exercicio no kanban ja carrega o `id` do `exercicios_treino` quando vem de `loadExistingProgram` — esse `id` E o `card_original_id`.

Na insercao:
```typescript
card_original_id: exercicio.id.startsWith("exercise-") ? null : exercicio.id,
```

Nota: em `loadExistingProgram` (linha 139), o `id` do exercicio ja e o `exercicios_treino.id`. Entao quando o usuario customiza um programa pela primeira vez, o `id` do exercicio no kanban corresponde ao `exercicios_treino.id` — que e exatamente o `card_original_id`.

#### 3. `src/utils/programCustomizer.ts` — `updateUserProgram`
Ao inserir novos exercicios (linha 399-410), propagar `card_original_id` do exercicio existente ou do template.

#### 4. `src/components/workout/ExerciseSubstitutionDialog.tsx` — `fetchExerciseDetails`
Mudar para buscar diretamente por `card_original_id` em vez do match complexo por `exercicio_original_id + treino_original_id`:
```typescript
// Antes: match por exercicio_original_id (falha para custom)
// Depois: buscar card_original_id do exercicio do usuario, depois buscar exercicios_treino por id
const { data: exercicioUsuario } = await supabase
  .from('exercicios_treino_usuario')
  .select('card_original_id')
  .eq('id', currentExercise.id)
  .single();

if (exercicioUsuario?.card_original_id) {
  const { data: exercicioTreino } = await supabase
    .from('exercicios_treino')
    .select('available_groups, allow_multiple_groups')
    .eq('id', exercicioUsuario.card_original_id)
    .single();
  // usar dados...
}
```
Isso elimina a dependencia de `exercicio_original_id` e `treino_original_id` para encontrar o card.

#### 5. RPC `replace_exercise_future_instances` — usar `card_original_id`
Alterar o match para usar `card_original_id` em vez de `exercicio_original_id + ordem`:
```sql
-- Match atualizado (WHERE clause do UPDATE)
WHERE etu.card_original_id = v_current_exercise.card_original_id
  AND tu.programa_usuario_id = v_current_program_user_id
  AND tu.ordem_dia = v_current_workout.ordem_dia
  AND etu.concluido = false
  AND tu.ordem_semana >= v_current_workout.ordem_semana
```
Remover o match por `ordem` ja que `card_original_id` e suficiente para individualizar.

#### 6. `useExerciseActions.saveObservation` — usar `card_original_id`
Alterar a replicacao de observacoes para usar `card_original_id`:
```typescript
// Buscar card_original_id alem de exercicio_original_id
.select('exercicio_original_id, card_original_id, treino_usuario_id, ...')

// Replicar usando card_original_id (funciona para custom E originais)
if (currentExercise.card_original_id) {
  .eq('card_original_id', currentExercise.card_original_id)
} else if (currentExercise.exercicio_original_id) {
  .eq('exercicio_original_id', currentExercise.exercicio_original_id)
}
```

#### 7. `usePreviousSeries` — usar `card_original_id`
Adicionar parametro `cardOriginalId` e usar para buscar historico quando `exercicioOriginalId` e null.

#### 8. `useExerciseState.checkIsFirstWeek` — usar `card_original_id`
Adicionar fallback por `card_original_id` quando `exercicio_original_id` e null.

#### 9. `loadUserProgramForCustomize` — retornar `card_original_id`
Incluir `card_original_id` nos dados carregados para o kanban, permitindo que ao salvar alteracoes o valor seja preservado.

#### 10. Workout page — passar `card_original_id` no exercise object
Garantir que a pagina `Workout.tsx` busca e passa `card_original_id` para os componentes.

### Detalhes Tecnicos

**Por que `card_original_id` e melhor que `exercicio_original_id + ordem`:**
- `exercicio_original_id` aponta para `exercicios_iniciantes` (o exercicio generico) — pode ser null para custom e pode ser duplicado se dois cards usam o mesmo exercicio
- `card_original_id` aponta para `exercicios_treino` (o card especifico do programa) — e unico por definicao e nunca muda, mesmo que o usuario troque o exercicio

**Fluxo:**
```
exercicios_treino.id (card original do dev)
  → salvo em exercicios_treino_usuario.card_original_id
  → usado para recuperar allow_multiple_groups, available_groups
  → usado para individualizar exercicios na substituicao/observacao/historico
```

### Arquivos Modificados
1. Migracao SQL — coluna `card_original_id` + backfill + RPC atualizado
2. `src/utils/programCustomizer.ts` — salvar `card_original_id` na insercao
3. `src/utils/programLoader.ts` — carregar `card_original_id` para o kanban
4. `src/components/workout/ExerciseSubstitutionDialog.tsx` — buscar por `card_original_id`
5. `src/components/workout/hooks/useExerciseActions.ts` — replicar observacao por `card_original_id`
6. `src/components/workout/hooks/usePreviousSeries.ts` — buscar historico por `card_original_id`
7. `src/components/workout/hooks/useExerciseState.ts` — checkIsFirstWeek por `card_original_id`
8. `src/pages/Workout.tsx` — passar `card_original_id` no exercise object
9. `src/components/workout/ExerciseCard.tsx` — interface atualizada

