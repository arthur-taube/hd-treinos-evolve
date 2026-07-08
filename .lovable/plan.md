## Objetivo

Permitir que o admin defina uma **faixa de semanas (mín–máx)** no mesociclo, em vez de um número único. Na hora de ativar o programa, o usuário escolhe **um único número dentro da faixa**, e o sistema gera apenas essas semanas — cortando o excedente conforme o nível.

## Regras de corte (confirmadas)

- **Iniciante e Intermediário**: corta as **últimas** semanas. Ex: faixa 6–10, usuário escolhe 8 → mantém semanas 1–8.
- **Avançado**: corta as **primeiras** semanas (as mais leves, longe da falha). Ex: faixa 6–10, usuário escolhe 8 → mantém semanas 3–10 (mantendo a numeração original 3..10, que casa com o modelo mental do usuário e com o RER por semana já definido).
- **Valor padrão** pré-selecionado ao usuário: **média arredondada** da faixa (ex: 6–10 → 8; se necessário, arredondar para cima, ex: 4,5 arredonda para 5).

## Banco de dados

Adicionar duas colunas à tabela `mesociclos`:

- `semanas_min` (inteiro, opcional)
- `semanas_max` (inteiro, opcional)

Migração de dados existentes: preencher `semanas_min = semanas_max = duracao_semanas` (faixa fixa; sem cortes até o admin editar). `duracao_semanas` continua representando o comprimento total do template (igual ao máximo).

## Editor do admin (criação/edição de programa)

Na 2ª tela (`ExerciseKanbanAdvanced` e `ExerciseKanban`), substituir a caixa única "Duração (semanas)" por **duas caixas**: "Semanas (mín)" e "Semanas (máx)", com validação `mín ≤ máx`.

- O número das colunas de semanas montadas (e, no avançado, o número de linhas de "RER alvo por semana") passa a ser o **máximo** da faixa.
- `ProgramExercisesForm` guarda min/max por mesociclo e grava `semanas_min`, `semanas_max` e `duracao_semanas` (= máx) em `mesociclos`, tanto na criação quanto na reconciliação/edição.

## Tela de ativação do programa (usuário)

Em `ProgramCustomize`, no bloco "Dados do Programa / Duração":

- Se `semanas_min === semanas_max`: exibe o número fixo (comportamento atual).
- Se houver faixa: mostra um **seletor numérico único** limitado a `[mín, máx]`, com padrão = média arredondada. Um texto auxiliar explica a faixa disponível (ex: "Escolha entre 6 e 10 semanas").
- O valor escolhido é passado para a geração do programa.

## Geração do programa do usuário (corte)

Em `programCustomizer.ts` (`saveCustomizedProgram`):

- Nova função utilitária `computeKeptWeeks(level, selected, max)` que retorna a lista de **números de semana do template** a manter:
  - iniciante/intermediário → `[1 .. selected]`
  - avançado → `[max - selected + 1 .. max]`
- O loop de geração passa a iterar sobre essa lista. Para cada semana mantida:
  - `ordem_semana` = número da semana do template (preserva 1–8 no iniciante/intermediário e 3–10 no avançado, mantendo o RER por semana correto via `rer_por_semana`).
  - O cálculo de data/cronograma usa a **posição sequencial** (0,1,2,…) e não o número da semana, para que as datas comecem corretamente na primeira sessão independentemente do corte.
- `totalWeeks` para cronograma flexível passa a ser o número selecionado.

Como o RER avançado é resolvido dinamicamente por `rer_por_semana[ordem_semana]`, manter a numeração original garante que as semanas remanescentes usem exatamente o RER definido pelo admin — sem necessidade de remapeamento.

## Detalhes técnicos

- `programLoader.ts`: incluir `semanas_min`/`semanas_max` ao carregar mesociclos, disponibilizando-os para a tela de customização.
- `ProgramCustomize.tsx`: novo estado `selectedWeeks`, seletor com clamp em `[min,max]`, passado a `saveCustomizedProgram`.
- `programCustomizer.ts`: assinatura recebe `selectedWeeks`; usa `computeKeptWeeks`; ajusta cálculo de datas por índice sequencial.
- Editor: estados `semanasMin`/`semanasMax` por mesociclo em `ProgramExercisesForm`, propagados para os dois Kanbans; UI de RER por semana renderiza `semanas_max` linhas.
- Sem mudanças em RLS (colunas novas herdam as políticas existentes de `mesociclos`).

## Validação

- Criar programa avançado com faixa 6–10, montar RER das 10 semanas; ativar escolhendo 8 → confere que restam semanas 3–10 com o RER correto.
- Criar programa iniciante/intermediário com faixa 6–10, escolher 8 → confere semanas 1–8.
- Programa antigo (sem faixa) continua funcionando como número fixo.
- `tsgo` typecheck limpo.
  &nbsp;

Adiciona faixa mín–máx de semanas definida pelo admin, seletor único para o usuário dentro da faixa, e corte de semanas por nível (últimas para iniciante/intermediário, primeiras para avançado).