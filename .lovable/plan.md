# Sistema Intermediário "STAR"

Novo algoritmo de progressão/feedback para programas de nível **intermediário**, distinto do avançado. O avançado permanece intacto. O roteamento continua por `nivel`: `iniciante` → sistema básico; `avancado` → sistema avançado atual; `intermediario` → novo sistema STAR (reutilizando as tabelas `_avancado` com colunas novas).

## Princípios

- RER sempre **1-0** (editor de RER por semana mantido, mas já começa pré-preenchido em 1-0 se nível do programa for intermediário).
- Faixa de repetições: duas faixas novas que serão preferencialmente usadas **4-25 e 4-14** (periodização ondulatória) - já criadas pelo dev na DB.
- Duração fixa por enquanto (ex.: 8 semanas). A escolha min-max de semanas fica para depois.
- Feedback: **ARA** logo após o exercício (Fadiga + Performance, com possível 2º diálogo de Recuperação) e **ART** (dor) no início do próximo treino do mesmo músculo — igual ao avançado.
- Progressão **Epley** sempre buscando o menor aumento de 1RMe possível, matriciando 7-25 ou 7-14 reps (usar como base a faixa escolhida, mas descartando as três primeiras repetições, 4 a 6 em ambas as faixas).

## Mudança 1 — Banco de dados

Migração (colunas novas em `exercicios_treino_usuario_avancado`, usadas só quando `nivel = intermediario`):

- `deload` (boolean, default false) — marca a instância cuja **execução** deve aplicar o deload reativo no frontend.
- `avaliacao_recuperacao` (numeric, nullable) — pontuação do 2º diálogo (Recuperação), quando "Pior, regredi" (COLUNA JÁ EXISTENTE).
- `avaliacao_desempenho` (text, nullable) — para marcar "pior" (Pior, regredi) ou "melhor" (Maior ou igual) na avaliação de performance do nível intermediário - e não causar conflito com a coluna avaliacao_performance (numérica, já existente).
- `progressao_base_peso` (numeric, nullable) e `progressao_base_reps` (integer, nullable) — a **progressão sugerida original** (pré-deload) guardada para o retorno.

Reutilizamos `avaliacao_fadiga` (Fadiga) já existente. A coluna`avaliacao_performance`permanecerá disponível caso o admin queira usar a AMP (do nível avançado) eventualmente.

Novas faixas de reps para intermediário (já criadas pelo dev, não precisa alterar) em `faixas_repeticoes_avancado`: **4-25** e **4-14**.

## Mudança 2 — Montagem do programa (admin)

Arquivos: `ProgramStructureForm`, `ExerciseKanbanAdvanced`, `MuscleGroupDialogAdvanced`, editor de RER.

- Ao montar programa `intermediario`: RER de todas as semanas pré-preenchido em 1-0 (mas sem desabilitar a escolha).
- Faixa de reps oferecidas: as mesmas da tabela avançada - já contendo as novas faixas de 4-14 e 4-25 criadas pelo dev na database.
- Modelo de feedback dos exercícios: ARA/ART (manter possibilidade de escolha de AMP, caso o admin venha a querer usar - por padrão mostra ARA/ART pré-selecionada).

## Mudança 3 — Diálogo ARA (Fadiga + Performance)

Novo componente (ou variante por `nivel`) baseado em `ARAFeedbackDialog`:

Ordem: **1º Fadiga, 2º Performance** (Pump removido).

Fadiga — pergunta contextual "Como você sentiu o(s) músculo(s) [grupo] após [exercício]?":

- Baixa: **+0,75**
- Razoável/Boa: **+0,25** (esse valor mudou em relação ao avançado)
- Extrema: **−0,75**

Performance:

- "Maior ou Igual" (verde): mantém `deload = false` na próxima semana.
- "Pior, regredi" (vermelho): ao clicar no botão salvar da primeira dialog box, se marcada essa opção abre imediatamente o **diálogo de Recuperação**.

Diálogo de Recuperação (só se "Pior, regredi") - três botões dispostos verticalmente (três linhas - um botão sobre o outro ao invés de ao lado como na primeira caixa de diálogo) e exibição da legenda abaixo deles (antes do botão salvar/cancelar - se cancelar volta para a primeira caixa com as opções escolhidas já marcadas):

- Aumento de séries anteriores: **0 pts** (mostrar o texto explicativo/legenda: "Houve aumento de séries em exercício anterior para esse mesmo músculo hoje e cheguei no exercício mais fatigado do que no treino passado.")
- Estou em um dia ruim: **1 pt** (mostrar o texto explicativo: "Não estou bem hoje. Dormi e/ou me alimentei mal / Tive um dia estressante / Estou mentalmente cansado.")
- Estou sempre exausto: **2 pts** (mostrar o texto explicativo: "Venho sentindo estes músculos exaustos e/ou com dores na(s) última(s) semana(s) e tenho notado que meu desempenho vem regredindo.")

## Mudança 4 — Cálculo do Deload (decisão automática)

Ao salvar ARA com "Pior, regredi", somar:

1. **Recuperação** (0/1/2, escolha do usuário).
2. **Tendência de queda** do 1RMe Epley da série 1 nas últimas 3 semanas (calculada no frontend): subiu depois de cair = 0; caiu e manteve = +0,5; caiu e seguiu caindo = +1.
3. **Fadiga extrema** nesta avaliação = +1 (senão 0).

Se **soma ≥ 3** → grava `deload = true` na instância da **próxima semana** desse exercício.

O cálculo normal de séries (Fadiga +0,75/+0,25/−0,75 somado às séries atuais) e a progressão Epley continuam sendo gravados normalmente para a próxima semana, **junto** com a flag de deload.

## Mudança 5 — Deload reativo (somente frontend)

Quando a instância a ser executada tem `deload = true`, o card de treino exibe (sem alterar o valor salvo no banco):

- Séries: **−1** (sobre o valor calculado/salvo).
- Carga: **70%** da progressão sugerida.
- Reps: **metade** das reps da progressão sugerida (mín 5, máx 12).

## Mudança 6 — Retorno do deload (solução do problema levantado)

Para o retorno não ficar leve demais:

- Ao gravar `deload = true`, gravamos também `progressao_base_peso` / `progressao_base_reps` = a **progressão sugerida original** daquela semana (antes da redução aplicada ao deload no frontend).
- A semana **seguinte ao deload** repete os dados da progressão Epley salvos nessas colunas de referência (mesma carga e repetições salvas), **ignorando** as séries reduzidas efetivamente executadas no deload.
- O número de séries no retorno é recalculado normalmente a partir do feedback dado na semana de deload.

Efeito: o usuário faz uma semana leve (deload) e retorna exatamente na trajetória de progressão que teria seguido sem o deload.

## Mudança 7 — Progressão Epley (STAR)

Variante de `useEpleyProgression` para intermediário:

- Matriz de **7-25 ou 7-14 reps** (descarta as 3 primeiras das faixas: 4-6).
- Cargas: 6 adjacentes (3 incrementos mínimos acima e 3 abaixo) da carga anterior.
- Escolhe **o menor aumento de 1RMe positivo possível**; empate entre duas → **carga maior**.
- Base da conta: sempre a primeira série executada na semana anterior, salvo quando a instância anterior teve `deload = true` (usa `progressao_base_*`).

## Mudança 8 — ART (dor) no STAR

Reutiliza `useARTCheck` + `ARTFeedbackDialog` exatamente como no avançado:

- Nunca dolorido/200%: **+0,25**; Alguma dor/100%: **0**; Ainda dolorido/não recuperado: **−0,25**.
- Ajusta séries da próxima instância do mesmo músculo (soma ao cálculo de séries).

## Validação

- Montar um programa intermediário de teste e verificar: RER 1-0 pré-preenchido, se as faixas de 4-25 e 4-14 existem, feedback ARA na nova ordem.
- Simular queda de desempenho e confirmar `deload = true` quando soma ≥ 3.
- Confirmar no frontend as reduções do deload e, na semana seguinte, a progressão gravada em `progressao_base_*` (retorno na trajetória correta).

## Detalhes técnicos

- Roteamento: manter `nivel !== 'iniciante'` para tabelas, mas ramificar a **lógica de feedback/progressão** por `nivel === 'intermediario'` (STAR) vs `nivel === 'avancado'`.
- Todas as colunas novas são nullable/default para não afetar dados avançados existentes.
- Tendência de queda usa `series_exercicio_usuario` (série 1) das 3 últimas instâncias concluídas do mesmo `card_original_id`/`exercicio_original_id`.
  &nbsp;

Plano para criar o sistema intermediário "STAR": novo algoritmo de feedback (ARA Fadiga+Performance/"desempenho" com 2º diálogo de Recuperação), ART de dor, deload automático (soma ≥ 3), deload reativo só no frontend, e progressão Epley (7-25 ou 7-14) com menor aumento de 1RMe. Reutiliza tabelas _avancado com colunas novas (deload, progressao_base_peso/reps, avaliacao_recuperacao, avaliacao_desempenho), RER semanal pré-selecionado em 1-0 quando programa intermediário e novas faixas de reps disponíveis (4-25 e 4-14). Resolve o retorno do deload guardando a progressão sugerida original.