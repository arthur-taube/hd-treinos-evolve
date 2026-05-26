## Plano: Corrigir "Alterar este treino" e "Reiniciar este treino"

### Problema 1 — "Alterar este treino" puxa o template, não a execução atual

`loadUserProgramForCustomize` (em `src/utils/programLoader.ts`) sempre carrega `ordem_semana = 1`, que é o template inalterado. Resultado: alterar a ordem/dia de um exercício faz o usuário perder todos os ajustes acumulados (séries, peso, substituições, métodos especiais etc.) das semanas já avaliadas.

**Solução:** carregar, por dia (`ordem_dia`), o **próximo treino não concluído** (menor `ordem_semana` com `concluido = false AND pulado = false`). Se todos estiverem concluídos, cai no último concluído. Os exercícios desse treino representam o estado vigente — já incorporam ARA/AMP/ART, substituições e mudanças de método.

Mudanças em `loadUserProgramForCustomize`:

- Buscar `treinos_usuario` do programa inteiro, agrupar por `ordem_dia`, escolher por dia o primeiro não concluído (ou último como fallback).
- Usar os `treino_usuario_id`s selecionados em vez de filtrar por `ordem_semana = 1` ao buscar exercícios (em ambos os ramos: iniciante e avançado).
- Manter o restante (lookup de template para `allow_multiple_groups`/`available_groups`, dayTitles vindos desses mesmos treinos, etc.).

Observação sobre ART: a ART continua funcionando porque o `card_original_id`/`exercicio_original_id` é preservado nas edições; o reordenamento entre dias já é tratado em `updateUserProgram` (propaga para futuros). Não há mudança no save.

### Problema 2 — "Reiniciar este treino" não reseta tudo

Em `ActiveProgram.tsx` → `handleRestartWorkout`, o reset atual:

- só toca em `exercicios_treino_usuario` (iniciante) — programas avançados ficam intactos, logo `concluido = true` persiste e o botão "Concluir exercício" continua desabilitado;
- não apaga/zera os registros de `series_exercicio_usuario`, que guardam `concluida = true` por série → ao reabrir o treino, todas as séries vêm marcadas (V verdes) e `allSetsCompleted` é `true`, mostrando "Todas séries concluídas".

**Solução:** detectar o nível do programa do treino e resetar a tabela certa, e em ambos os casos apagar as séries gravadas.

Mudanças em `handleRestartWorkout`:

1. Descobrir o nível do programa (já temos `programaUsuario.programas.nivel` no escopo da página) ou, mais robusto, fazer reset condicional pelas duas tabelas.
2. Para iniciante: manter o reset atual de `exercicios_treino_usuario` (limpar `concluido`, `avaliacao_dificuldade`, `avaliacao_fadiga`, `data_avaliacao`).
3. Para avançado: aplicar reset equivalente em `exercicios_treino_usuario_avancado`, limpando `concluido`, `avaliacao_pump`, `avaliacao_fadiga`, `avaliacao_performance`, `data_avaliacao` (e, se existir, qualquer flag de ART pendente — a ser confirmado lendo o schema dessa tabela).
4. Em ambos os casos, buscar os IDs dos exercícios desse `treino_usuario_id` e deletar (ou atualizar `concluida = false` + zerar `peso`/`repeticoes`) os registros de `series_exercicio_usuario` correspondentes. Preferência: **delete** — mais simples e garante que ao reabrir o treino as séries voltem ao estado "vazio" (peso/reps sugeridos pela lógica normal).
5. Manter o reset de `treinos_usuario` (`concluido`, `pulado`, `data_concluido`) e a atualização do estado local.

### Arquivos afetados


| Arquivo                       | Alteração                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/utils/programLoader.ts`  | `loadUserProgramForCustomize`: escolher por dia o próximo treino não concluído em vez de `ordem_semana = 1`     |
| `src/pages/ActiveProgram.tsx` | `handleRestartWorkout`: resetar tabela avançada quando aplicável + deletar `series_exercicio_usuario` do treino |


### Pontos a confirmar antes de implementar

- Existe alguma coluna de "ART pendente / aplicada" em `exercicios_treino_usuario_avancado` que precise ser resetada também? Vou inspecionar o schema na implementação. Resposta: Ao reiniciar o exercício, vamos resetar todas as avaliações sim, inclusive ART, por consistência (imagino que no caso prático ou não terá ART ou o usuário repetirá os treinos seguintes também, devendo avaliar ART no treino seguinte).
- Confirmar que apagar `series_exercicio_usuario` é o comportamento desejado (vs. apenas marcar `concluida = false`). Apagar é mais limpo e consistente com "reiniciar do zero". Resposta: Sim, vamos deletar as séries anteriormente completadas e o usuário preenche "do zero" novamente (com base na performance da semana antecedente, como normalmente apareceria no histórico se ele estivesse executando o treino pela primeira vez).