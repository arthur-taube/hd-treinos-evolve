

## Buscar video_url dinamicamente de exercicios_iniciantes

### Problema
A coluna `video_url` em `exercicios_treino_usuario` armazena o URL do exercicio original do card. Quando o usuario substitui por um exercicio custom, o `video_url` antigo permanece, mostrando o botao de video incorretamente.

### Solucao
Em vez de usar o `video_url` salvo na tabela do usuario, buscar dinamicamente da `exercicios_iniciantes` pelo `exercicio_original_id` do exercicio atualmente em uso (considerando substituicoes). Para custom, nao ha `exercicio_original_id`, logo nao ha video — botao fica invisivel.

### Implementacao

#### 1. `src/components/workout/components/ExerciseHeader.tsx`
- Adicionar um `useState` + `useEffect` que busca o `video_url` de `exercicios_iniciantes` com base no exercicio atualmente ativo:
  - Se tem `substituto_oficial_id` → buscar video desse exercicio em `exercicios_iniciantes`
  - Se tem `substituto_custom_id` → sem video (custom)
  - Senao → buscar pelo `exercicio_original_id`
- Remover `video_url` da interface de props (nao mais necessario vindo do parent)
- O botao Youtube so aparece se o fetch retornar um URL valido

#### 2. `src/pages/Workout.tsx`
- Passar `substituto_oficial_id` e `substituto_custom_id` na interface do exercicio (ja passa) para que o ExerciseHeader saiba qual exercicio esta ativo
- Remover `video_url` do select da query (opcional, nao quebra nada manter)

#### 3. Interface do ExerciseHeader
Adicionar `substituto_oficial_id` e `substituto_custom_id` as props do exercise para determinar qual ID buscar.

### Logica do fetch
```typescript
// Determinar qual ID buscar
const activeExerciseId = exercise.substituto_oficial_id || exercise.exercicio_original_id;
// Se custom (substituto_custom_id presente e sem oficial), nao buscar
if (!activeExerciseId) return; // sem video

const { data } = await supabase
  .from('exercicios_iniciantes')
  .select('video_url')
  .eq('id', activeExerciseId)
  .single();
```

### Arquivos modificados
1. `src/components/workout/components/ExerciseHeader.tsx` — fetch dinamico + interface atualizada
2. `src/components/workout/ExerciseCard.tsx` — interface atualizada (passar novos campos)

