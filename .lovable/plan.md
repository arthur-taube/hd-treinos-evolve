# Modo somente leitura para programas inativos

## Objetivo

Permitir abrir programas **pausados** e **finalizados** a partir de `/programs` (clicando no card) e revisitar tudo em modo **somente leitura**: a lista de treinos e cada treino completo (séries, pesos, reps registrados), sem permissão de edição, em qualquer nível (iniciante, intermediário, avançado).

## Como vai funcionar

```text
/programs
  ├─ Programa Ativo      → clique → /active-program            (comportamento atual)
  ├─ Programas Pausados  → clique → /program-view/<id>  [view] (novo)
  └─ Programas Finalizados → clique → /program-view/<id> [view] (novo)

/program-view/<id>  (mesma tela do programa, somente leitura)
  └─ clique no treino → /workout/<treinoId>?view=1  (treino somente leitura)
```

## Comportamento do modo leitura

**Na tela do programa (`/program-view/<id>`):**
- Mostra cabeçalho, progresso e lista de treinos com status (concluído/pulado), igual ao programa ativo.
- Sem menu de ações (⋮ pular/reiniciar), sem botões espiar/iniciar, sem CTA de finalizar.
- Clicar em qualquer treino abre o treino em modo leitura.

**Dentro do treino (`?view=1`):**
- Inputs de peso/reps em `readOnly`; checkboxes "concluir série", "+ série", notas, observação e menus (substituir/observação/incremento/método especial) ocultos/desabilitados — para **todos os níveis**.
- Timer oculto.
- Botão "Concluir Treino" oculto.
- ART e progressão automática suprimidos (nada é gravado).
- Banner "Modo visualização — somente leitura" (sem botão "Iniciar treino", pois o programa não está ativo).
- "Voltar" retorna para `/program-view/<id>`; navegação entre treinos preserva `?view=1`.

## Mudanças técnicas

### 1. Rota nova
- `src/App.tsx`: adicionar rota `/program-view/:programaUsuarioId` renderizando `ActiveProgram` dentro do `AppLayout`.

### 2. `src/pages/ActiveProgram.tsx` — suportar modo leitura
- Ler `useParams().programaUsuarioId`. Definir `readOnly = !!programaUsuarioId`.
- No fetch: se `programaUsuarioId` presente, buscar `programas_usuario` por `id` (qualquer estado) em vez de `ativo = true`; validar que pertence ao usuário logado.
- Quando `readOnly`:
  - Card do treino: sempre `cursor-pointer`, `onClick` → `navigate('/workout/${treino.id}?view=1')`; ocultar botões espiar/iniciar e o menu ⋮.
  - Ocultar o bloco "Concluir Programa" (troféu) e handlers de pular/reiniciar/finalizar.
  - Ajustar título do `PageHeader` (ex.: nome do programa / "Visualizar programa") e manter botão "Voltar" → `/programs`.

### 3. `src/pages/Workout.tsx` — read-only para todos os níveis
- Novo flag: `viewMode = new URLSearchParams(location.search).get('view') === '1'`.
- `readOnly = viewMode || peekMode` (peek continua só avançado; view vale para todos).
- Usar `readOnly` no lugar de `peekMode` em: supressão do `useARTCheck`, guards de `toggleExerciseCompletion`/`updateExerciseWeight`/`completeWorkout`, ocultar "Concluir Treino" e o `WorkoutTimer`.
- Pular `applyWorkoutProgression(treinoId)` no caminho iniciante quando `readOnly` (hoje ele grava).
- Passar `readOnly` para `ExerciseCardAdvanced` (prop `peekMode` existente) **e** para `ExerciseCard` (iniciante — nova prop).
- Banner: quando `viewMode`, texto "Modo visualização — somente leitura" sem o botão "Iniciar treino"; quando `peekMode` (espiar atual), mantém o botão.
- "Voltar" e navegação adjacente: em `viewMode`, voltar para `/program-view/${treino.programa_usuario_id}` e preservar `?view=1` ao trocar de treino.

### 4. Cards iniciantes somente leitura (espelhar o que já existe no avançado)
- `src/components/workout/ExerciseCard.tsx`: aceitar `readOnly?: boolean` e propagar.
- `src/components/workout/components/ExerciseHeader.tsx`: ocultar menu de ações (substituir/observação/incremento) em `readOnly`.
- `src/components/workout/components/ExerciseSets.tsx`: inputs `readOnly`, desabilitar checkboxes/"+ série"/notas e ocultar "Concluir exercício".
- `src/components/workout/hooks/useExerciseState.ts`: não abrir automaticamente o diálogo de incremento quando `readOnly`.

### 5. `src/pages/Programs.tsx` — abrir inativos
- Passar `onOpen={() => navigate('/program-view/${program.id}')}` nos `ProgramCard` de **pausados** e **finalizados**.
- `ProgramCard`/`ProgramOptionsMenu` já suportam `onOpen` no clique do corpo do card; nenhuma mudança estrutural necessária além de fornecer o handler.

## Arquivos a alterar
- `src/App.tsx`
- `src/pages/ActiveProgram.tsx`
- `src/pages/Workout.tsx`
- `src/components/workout/ExerciseCard.tsx`
- `src/components/workout/components/ExerciseHeader.tsx`
- `src/components/workout/components/ExerciseSets.tsx`
- `src/components/workout/hooks/useExerciseState.ts`
- `src/pages/Programs.tsx`

## Fora de escopo
- Sem mudanças de schema/RLS. Guards são client-side; o backend já restringe escritas ao dono. (RLS de leitura para programas inativos já funciona, pois pertencem ao próprio usuário.)
- O modo "espiar" (`?peek=1`) do programa ativo permanece como está.
