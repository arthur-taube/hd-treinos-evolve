# Corrigir edição de programa pelo dev (mesociclo duplicado)

## Problema

Ao usar "editar programa" (dev), o app cria um **segundo mesociclo** com as alterações em vez de **sobrescrever** o existente.

Causa: `updateExistingProgram` apaga e recria `mesociclos`/`treinos`/`exercicios_treino`. Mas usuários que já iniciaram o programa têm `treinos_usuario.treino_original_id` apontando para os `treinos` do template, e essa chave estrangeira é **NO ACTION**. O `DELETE` dos `treinos` (e dos `mesociclos`) falha silenciosamente — o código não checa o erro — então a recriação gera mesociclos/treinos duplicados.

Confirmado no banco: programa "Sun's Out Guns Out - 5x/semana" tem 2 mesociclos `numero = 1` (antigo de 07/06 e novo de 10/06), com 50 `treinos_usuario` referenciando o template.

## Objetivo

"Editar programa" deve **atualizar o template no lugar**, preservando os `treinos`/`mesociclos` existentes (e portanto as referências dos usuários), sem nunca criar duplicatas.

## Mudança 1 — Reescrever `updateExistingProgram` (atualização in-place)

Arquivo: `src/components/programs/ProgramEditor/ProgramExercisesForm.tsx`

Em vez de apagar e recriar `mesociclos`/`treinos`, reconciliar:

1. Atualizar os campos do `programas` (como já faz hoje).
2. Para cada mesociclo (1..N):
  - Buscar o mesociclo existente por `programa_id` + `numero`.
  - Se existir: **atualizar** (`duracao_semanas`, `cronogramas_recomendados`, `rer_por_semana`) e reutilizar seu `id`.
  - Se não existir: inserir um novo.
3. Para os `treinos` de cada mesociclo:
  - Buscar os existentes por `mesociclo_id`.
  - Casar por (`ordem_semana`, `ordem_dia`) e **atualizar** `nome`/`nome_personalizado` no lugar (preservando o `id`, mantendo as referências de `treinos_usuario`).
  - Inserir apenas os treinos faltantes (se a estrutura cresceu).
4. Para os **exercícios da semana 1** (template), que são seguros de recriar pois nenhuma tabela de usuário os referencia por FK:
  - Apagar `exercicios_treino` / `exercicios_treino_avancado` apenas dos `treinos` da semana 1 e reinserir com os dados editados (mesma lógica de montagem já existente).
5. **Checar o erro de toda operação** de delete/insert/update e lançar exceção em caso de falha (a ausência dessa checagem foi o que escondeu o bug).

Observação: a tabela alvo de exercícios depende do nível — `exercicios_treino_avancado` para avançado, `exercicios_treino` para iniciante (este programa é `avancado`).

## Mudança 2 — Limpeza da duplicata já existente (correção pontual de dados)

O mesociclo correto (10/06) não está ligado aos usuários; o antigo (07/06) está. Para deixar consistente:

1. Corrigir novamente o programa e salvar (confirmando que as mudanças ocorreram no mesociclo antigo).
2. Apagar o mesociclo duplicado novo (`8ef3c5cf-...`) — ele não tem referências de usuários, então o cascade remove seus treinos/exercícios sem problema.

Isso será feito manualmente (dev deleta na DB), já servindo também como teste da correção do "bug".

## Detalhes técnicos

- FK relevante: `treinos_usuario_treino_original_id_fkey` (NO ACTION) — motivo de nunca podermos deletar `treinos` do template em uso.
- `treinos -> mesociclos` é CASCADE e `exercicios_treino -> treinos` é CASCADE, mas o gargalo é sempre o `treinos_usuario`.
- A reconciliação preserva `treinos.id`, então nada nas tabelas de usuário quebra.
- Mudanças estruturais grandes (alterar frequência semanal ou número de mesociclos de um programa já em uso) continuam sendo casos sensíveis; o plano cobre o caso pretendido (ajustes simples) atualizando o que existe e inserindo o que falta, sem apagar linhas referenciadas.

## Validação

- Reexecutar uma edição simples no programa afetado e confirmar no banco que **continua existindo apenas 1 mesociclo por número** e que as alterações aparecem nos `treinos`/exercícios referenciados pelos usuários.