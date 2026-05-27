# Modo Espiar (read-only) — apenas Intermediário/Avançado

## Viabilidade

Baixa-média complexidade. `Workout.tsx` é o único entry point da tela e as escritas estão concentradas em poucos handlers. Um flag `peekMode` propagado + guards resolvem. A progressão sugerida continua sendo calculada pelos hooks de leitura (`useEpleyProgression`, `usePreviousSeries*`) — só não persistimos. O ART autodisparado é suprimido pelo próprio `enabled` do `useARTCheck`.

Iniciantes ficam fora — não há gatilhos temporais como o ART, então não há benefício e nem motivo para adicionar peça nova de UI.

## UX

**Entradas (apenas quando programa for intermediário/avançado):**
- Dois botões lado a lado em cada card de treino: olho (Espiar) + play (Iniciar), com `title`/`aria-label`.
- Locais: `NextWorkoutCard` (dashboard) e cards de treino do `ActiveProgram`.
- Iniciante mantém o comportamento atual (clique único → inicia).
- Treinos já concluídos: sem botão de Espiar (já são histórico read-only).

**Dentro do Workout em modo espiar:**
- Banner no topo: ícone de olho + "Modo visualização — nada será salvo" + botão "Iniciar treino" (`navigate(\`/workout/${id}\`, { replace: true })`).
- Timer oculto.
- Inputs de peso/reps `readOnly`; checkboxes "concluir série", "+ série", notas e menus (substituir/observação/incremento/método especial) ocultos/desabilitados.
- Acordeões + sugestões (Epley/ARA/ART projetada) continuam visíveis.
- Botão "Concluir Treino" oculto.
- Dialogs (ARA/ART/AMP/Substituição/Método/Incremento) não disparam.

## Mudanças técnicas

1. **Flag a partir da URL** — `src/pages/Workout.tsx`
   - `const peekMode = new URLSearchParams(useLocation().search).get('peek') === '1';`
   - Se `!isAdvanced && peekMode`, ignorar o flag (defesa) — peek só vale para avançado.
   - Propagar `peekMode` para `WorkoutTimer`, `ExerciseCardAdvanced`. `ExerciseCard` (iniciante) não recebe.

2. **Suprimir ART e progressão automática**
   - `useARTCheck(..., isAdvanced && !loading && !peekMode)`.
   - Pular `applyWorkoutProgression(treinoId)` quando `peekMode` (não muta `series` antes do treino real). N/A para avançado, mas mantemos o guard por simetria.

3. **Guardar escritas (defesa em profundidade)**
   - `toggleExerciseCompletion`, `updateExerciseWeight`, `completeWorkout`: `if (peekMode) return;`.
   - Ocultar botão "Concluir Treino" quando `peekMode`.

4. **Cards read-only (apenas variante avançada)**
   - `ExerciseCardAdvanced`: aceitar `peekMode?: boolean` e propagar.
   - `ExerciseHeaderAdvanced`: ocultar menus de ação (substituir, observação, incremento, método especial) em peek.
   - `ExerciseSetsAdvanced`: inputs `readOnly`, checkboxes/botões "+ série"/notas desabilitados.
   - Todos os `setShow*Dialog(true)`: `if (peekMode) return`.

5. **Timer** — `WorkoutTimer.tsx`: aceitar `peekMode` e renderizar `null` quando ativo.

6. **Banner** — componente inline no topo do conteúdo do `Workout.tsx`.

7. **Entradas (dois botões) — apenas avançado**
   - `src/components/dashboard/NextWorkoutCard.tsx`: nova prop `onPeek?: () => void`. Quando presente, renderiza `Eye` + `Play`; quando ausente, mantém só o play (compat iniciante).
   - `src/pages/Dashboard.tsx`: incluir `nivel` em `useDashboardData` (`programas!inner(nome, nivel)`) e passar `onPeek` apenas se `nivel !== 'iniciante'`.
   - `src/hooks/useDashboardData.ts`: adicionar `nivel` ao retorno do programa ativo.
   - `src/pages/ActiveProgram.tsx`: já tem `programaOriginal.nivel`. Nos cards de treino, quando avançado E treino não concluído, renderizar dois CTAs (olho/play); caso contrário, manter o clique único atual.

## Arquivos a alterar

- `src/pages/Workout.tsx`
- `src/components/workout/WorkoutTimer.tsx`
- `src/components/workout/ExerciseCardAdvanced.tsx`
- `src/components/workout/components/ExerciseHeaderAdvanced.tsx`
- `src/components/workout/components/ExerciseSetsAdvanced.tsx`
- `src/components/dashboard/NextWorkoutCard.tsx`
- `src/pages/Dashboard.tsx`
- `src/hooks/useDashboardData.ts`
- `src/pages/ActiveProgram.tsx`

## Fora de escopo

- Iniciante: sem mudanças (`ExerciseCard`, `ExerciseHeader`, `ExerciseSets` ficam intactos).
- Nenhuma mudança de schema/RLS. Guards são client-side; backend já restringe writes ao dono.
