# Semana de Deload (avançado/intermediário)

## Objetivo
Permitir que o usuário inicie **uma única semana de deload por programa**, disponível a partir do momento em que ele **inicia a 3ª semana**. O botão fica **sempre no fim da lista de semanas** (acima do botão de finalizar), exige **confirmação**, e ao concluir todos os dias do deload o programa fica pronto para ser **finalizado**.

Aplica-se somente a programas **avançado** e **intermediário (STAR)** — nunca iniciante. Esta semana de deload **não tem relação** com o deload reativo do sistema STAR (que age em um único exercício); aqui o deload é para o programa inteiro e usa fórmulas próprias.

## Regras confirmadas
- **Aparece**: a partir do início da 3ª semana (existe treino concluído/iniciado com `ordem_semana >= 3`).
- **Posição**: sempre no rodapé da página `active-program`, logo acima do botão "Concluir Programa".
- **Confirmação**: `AlertDialog` perguntando se o usuário realmente deseja **pular todos os treinos não concluídos** (se houver) e iniciar a semana de deload.
- **Único deload por programa**: depois de criado, o botão some.
- **Após concluir o deload**: todos os treinos ficam concluídos/pulados → aparece o bloco "Concluir Programa". Não bloqueamos outras ações.
- **Dados congelados**: cada dia de deload concluído grava carga/séries/reps usadas. Reabrir/reiniciar treinos antigos **não** recalcula o deload — os valores ficam fixos.
- **Origem dos dados**: cada dia de deload copia do **último treino concluído daquele dia** (mesmo `ordem_dia`), independente da semana.

## Fórmulas da semana de deload

A semana é dividida em duas metades por **dia**, arredondando a primeira metade **para cima** (ex.: 5 dias → 3 dias na 1ª metade, 2 na 2ª; 4 dias → 2 e 2).

**Primeira metade da semana** — cada exercício mostra no cabeçalho do card **dois modelos** para o usuário escolher:
- **Volume** (opção padrão, pré-selecionada): carga **mantida** igual à do último workout concluído; séries e repetições **reduzidas em 50%**, arredondando para cima.
- **Carga**: séries e repetições **mantidas** iguais ao último workout concluído; carga **reduzida em 50%**, arredondando para cima e respeitando o incremento mínimo.

**Segunda metade da semana** — deload de **carga e volume combinados** (sem escolha):
- carga reduzida em 50%, séries reduzidas em 50% e repetições reduzidas em 50%, todos arredondando para cima.

Referências de arredondamento:
- Séries/reps: `ceil(valor / 2)`.
- Carga: `ceil((carga_base * 0.5) / incremento) * incremento` (respeita incremento mínimo; mín. 0).

## Banco de dados

Três tabelas novas (com GRANTs + RLS por `user_id`):

- `deload_semanas` — `programa_usuario_id`, `user_id`, `concluido`, `data_concluido`.
- `deload_dias` — `deload_semana_id`, `user_id`, `ordem_dia`, `nome`, `treino_origem_id`, `metade` (`primeira`/`segunda`), `concluido`, `data_concluido`.
- `deload_series` — `deload_dia_id`, `user_id`, `exercicio_nome`, `grupo_muscular`, `ordem`, `modo` (`volume`/`carga`/`combinado`), `numero_serie`, `peso`, `repeticoes`, `concluida`.

Cada dia de deload é gerado do último treino concluído com aquele `ordem_dia`; `metade` define se é 1ª (com escolha volume/carga) ou 2ª (combinado).

## Fluxo na tela (active-program)

1. **Botão "Iniciar semana de deload"** no rodapé (avançado/intermediário, ≥3ª semana iniciada, sem deload existente).
2. Clicar → `AlertDialog` de confirmação avisando que treinos não concluídos serão pulados.
3. Confirmar:
   - Pular todos os treinos não concluídos (reusa `handleSkipWorkout`).
   - Criar `deload_semanas` + um `deload_dias` por dia da frequência (marcando `metade`), copiando do último treino concluído daquele `ordem_dia`.
4. Bloco próprio "Semana Deload" no fim da lista, cards em cor distinta (laranja/roxo). Cada card abre a nova página `DeloadWorkout`.
5. Concluir um dia → grava em `deload_series`, marca `deload_dias.concluido`, card muda para tom mais escuro. **Não recomputa** dias já concluídos.
6. Todos os dias concluídos → `deload_semanas.concluido = true` e bloco "Concluir Programa" disponível.

## Nova página DeloadWorkout
Reaproveita `ExerciseCardAdvanced` em modo deload. No cabeçalho de cada exercício da **1ª metade**, seletor **Volume/Carga** (Volume default) que ajusta os valores exibidos; na **2ª metade**, valores combinados fixos. Grava em `deload_series`. Não altera a lógica normal de progressão/histórico dos treinos comuns.

## Validação
- Programa avançado/intermediário com 3ª semana iniciada → botão no fim; iniciar cria deload com dias copiados do último treino concluído de cada dia e `metade` correta.
- 1ª metade: alternar Volume (mantém carga, corta séries/reps) e Carga (mantém séries/reps, corta carga) funciona; padrão Volume.
- 2ª metade: carga, séries e reps todas reduzidas 50% (arredondando para cima).
- Concluir dia → grava em `deload_series`, card escurece; reabrir treino antigo não altera valores do deload.
- Concluído todo o deload → botão "Concluir Programa" disponível.
- Iniciante nunca vê o botão. Um deload por programa. Typecheck limpo.
