## Objetivo

Separar claramente dois comportamentos somente-leitura que hoje estão unificados na flag `readOnly`/`peekMode`:

- **Peek mode** (`?peek=1`, só avançado): espiar um treino **futuro** do programa ativo. Deve continuar rodando a progressão (Epley) para mostrar como peso/reps vão se comportar, **sem salvar**. Comportamento atual mantido.
- **View mode** (`?view=1`, todos os níveis): revisitar treinos **passados** de programas pausados/finalizados. **Nenhuma progressão** deve rodar; deve exibir exatamente os dados salvos pelo usuário em `series_exercicio_usuario` para aquele dia. O "Histórico recente" deve ficar oculto.

## Problema atual

`Workout.tsx` define `readOnly = peekMode || viewMode` e passa esse valor combinado para os cards via a prop `peekMode` (avançado) e `readOnly` (iniciante). Como resultado:
- No view mode o card avançado ainda roda o `useEffect` do Epley e sobrescreve os sets com sugestões de progressão, em vez de mostrar os dados reais.
- No iniciante os sets aparecem com placeholders de `exercise.peso`/`reps_programadas`, não com os valores reais salvos.
- O "Histórico recente" aparece mesmo quando estamos olhando dados de uma semana específica.

A correção é introduzir uma flag distinta `viewMode` que desce até os cards, separada do `peekMode`, e usar essa flag para alternar a fonte de dados.

## Mudanças

### 1. Novo hook `useSavedSeries` (`src/components/workout/hooks/useSavedSeries.ts`)
- Assinatura: `useSavedSeries(enabled: boolean, exerciseId: string)`.
- Quando `enabled` (apenas view mode) e o card abrir, busca em `series_exercicio_usuario` por `exercicio_usuario_id = exerciseId`, ordenado por `numero_serie` ascendente.
- Retorna `{ savedSets, isLoadingSaved }` onde cada item tem `{ number, weight, reps, completed: true, note }`.
- Serve tanto iniciante quanto avançado (a tabela é compartilhada; a FK aponta para o id da instância do exercício, que é exatamente o exercício do dia visualizado).

### 2. `Workout.tsx` — propagar `viewMode` separado de `peekMode`
- Manter `peekMode` (peek, só avançado), `viewMode` (view, todos), e `readOnly = peekMode || viewMode` para os guards de escrita, timer e botão "Concluir Treino" (sem mudança nessa parte).
- Passar **duas props distintas** para os cards:
  - Avançado `ExerciseCardAdvanced`: manter `peekMode={peekMode}` (somente peek real) e adicionar `viewMode={viewMode}`.
  - Iniciante `ExerciseCard`: manter `readOnly={readOnly}` (UI desabilitada) e adicionar `viewMode={viewMode}`.
- Banner: já diferencia os textos; manter "Modo visualização — somente leitura." para view e "Modo visualização — nada será salvo." + botão "Iniciar treino" para peek.

### 3. `ExerciseCardAdvanced.tsx`
- Nova prop `viewMode?: boolean`. `readOnly` interno = `peekMode || viewMode` (para passar aos componentes filhos que desabilitam UI).
- **Epley**: continuar chamando `useEpleyProgression` apenas quando **não** for `viewMode`; pular o `useEffect` que sobrescreve sets com sugestões quando `viewMode` (em peek continua rodando como hoje).
- **Sets em view mode**: instanciar `useSavedSeries(isOpen && viewMode, exercise.id)`; quando os dados chegarem, sobrescrever `sets` com os valores reais (incluindo `note` por série).
- **Histórico recente**: passar `previousSeries={viewMode ? [] : previousSeries}` para `ExerciseSetsAdvanced`. Em peek, mantém o histórico atual.
- Passar `peekMode={readOnly}` para `ExerciseHeaderAdvanced`/`ExerciseSetsAdvanced` para manter inputs/menus desabilitados em ambos os modos (a UI continua read-only nos dois casos).

### 4. `ExerciseCard.tsx` (iniciante)
- Nova prop `viewMode?: boolean`.
- Instanciar `useSavedSeries(isOpen && viewMode, exercise.id)`; quando os dados chegarem em `viewMode`, sobrescrever `sets` com os valores reais (`weight`, `reps`, `completed: true`).
- Passar `previousSeries={viewMode ? [] : previousSeries}` para `ExerciseSets` para ocultar o "Histórico recente" no view mode.
- `readOnly` continua controlando a desabilitação dos inputs/menus (já implementado).

### 5. `useExerciseStateAdvanced.ts` / `useExerciseState.ts`
- Garantir que o diálogo de incremento não abra em nenhum dos modos read-only. Hoje o avançado checa `peekMode`; ajustar para receber também `viewMode` (ou receber o `readOnly` combinado) e não abrir o diálogo. (O iniciante já recebe `readOnly`.)

## Distinção final de comportamento

```text
                 | peek (?peek=1)        | view (?view=1)
-----------------+-----------------------+-----------------------
Progressão Epley | roda (sugestão)       | NÃO roda
Fonte dos sets   | sugestão progressão   | series_exercicio_usuario (dados reais)
Persistência     | nenhuma               | nenhuma
Histórico recente| visível               | oculto
Inputs/menus     | desabilitados         | desabilitados
Timer / Concluir | ocultos               | ocultos
```

## Arquivos
- `src/components/workout/hooks/useSavedSeries.ts` (novo)
- `src/pages/Workout.tsx`
- `src/components/workout/ExerciseCardAdvanced.tsx`
- `src/components/workout/ExerciseCard.tsx`
- `src/components/workout/hooks/useExerciseStateAdvanced.ts`
- `src/components/workout/hooks/useExerciseState.ts`

## Fora de escopo
- Sem mudanças de schema/RLS. As leituras de `series_exercicio_usuario` já são permitidas ao dono (`user_id = auth.uid()`).
- Peek mode permanece exatamente como está hoje.
