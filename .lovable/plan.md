
## Objetivo

Substituir o placeholder de `/stats` por uma página real com 4 seções que consolidam **todos os programas do usuário** (ativos, pausados e finalizados), cruzando dados iniciante e avançado.

## Seções

### 1. Constanciômetro
Dois `StatCard`s lado a lado:
- **Na semana**: `X/Y (Z%)` — Y = treinos previstos com `data_prevista` (ou `data_concluido` para os já feitos) dentro da semana ISO atual, X = subset com `concluido = true`.
- **No mês**: mesma lógica para o mês corrente.

Cobre treinos de `treinos_usuario` de qualquer `programa_usuario` do usuário. Deloads não entram na contagem (`deload_dias` fica separado).

### 2. Treinos realizados (gráfico de barras)
- Toggle de agrupamento: **Semana / Mês / Ano**, default **Mês**.
- Fonte: `treinos_usuario.data_concluido` (`concluido = true`) de todos os programas do usuário.
- Últimos 12 buckets do período selecionado; barra = contagem de treinos concluídos.
- Recharts `<BarChart>`, tokens semânticos (`hsl(var(--primary))`).

### 3. PRs (Recordes pessoais)
- Combobox com todos os exercícios em que o usuário tem ≥1 série concluída.
- Gráfico de linha: X = data (`series_exercicio_usuario.updated_at`), Y = **melhor 1RMe do dia** para aquele exercício (Epley `peso * (1 + reps/30)`).
- Ponto clicável → popover com "1RMe: {reps} × {peso}kg = {1rme}kg".

**Chave de identidade derivada em query** (sem alterar `series_exercicio_usuario`):
- Join com `exercicios_treino_usuario` **e** `exercicios_treino_usuario_avancado` pelo `exercicio_usuario_id`.
- Chave canônica por linha (COALESCE em ordem):
  1. `substituto_custom_id` (se `substituicao_neste_treino = true`)
  2. `substituto_oficial_id` (se `substituicao_neste_treino = true`)
  3. `exercicio_original_id`
  4. `nome` normalizado como fallback
- Nome exibido puxado de `exercicios_iniciantes` / `exercicios_avancados` / `exercicios_custom` conforme a origem.

Implementado como um hook `usePRData` que faz 2 queries paralelas (iniciante + avançado) e consolida no cliente.

### 4. Volume semanal por músculo
- Seletor de semana (default: semana atual).
- Gráfico `<BarChart>` de barras duplas por grupo: **previsto** vs **realizado**.
- Grupos padrão iniciais: Peitoral, Dorsais, Bíceps, Tríceps, Deltoide Lateral, Quadríceps, Posteriores.
- Botão de opções (ícone Settings) abre `Dialog` com checkboxes de todos os músculos disponíveis nas colunas primary/secondary/tertiary/quaternary/auxiliary_1..4 das duas tabelas de exercício → salva em `profiles.stats_volume_grupos_padrao text[]`.

**Contagem de séries por músculo**, por exercício da semana:
- primary/secondary/tertiary/quaternary_muscle → 1× séries.
- auxiliary_muscle_1..4 → 0,5× séries.
- **Previsto**: `series` (planejadas) do card.
- **Realizado**: nº de linhas em `series_exercicio_usuario` com `concluida = true`.

## Mudanças de banco (uma migration)

1. Adicionar em `exercicios_iniciantes` e `exercicios_avancados`:
   - `auxiliary_muscle_1 text`, `auxiliary_muscle_2 text`, `auxiliary_muscle_3 text`, `auxiliary_muscle_4 text` (todas nullable, sem default).
2. Adicionar em `profiles`:
   - `stats_volume_grupos_padrao text[]` (nullable — quando null, usa a lista padrão hardcoded).

Sem alterações em `series_exercicio_usuario` (chave derivada em query, conforme decidido). Sem triggers novas. Sem novas policies (colunas herdam RLS das tabelas existentes).

## Arquivos front-end

- `src/pages/Stats.tsx` — substitui placeholder; monta as 4 seções.
- `src/components/stats/ConsistencyCards.tsx`
- `src/components/stats/WorkoutsChart.tsx` (toggle semana/mês/ano)
- `src/components/stats/PRSection.tsx` + `src/hooks/usePRData.ts`
- `src/components/stats/VolumeChart.tsx` + `src/components/stats/VolumeGroupsDialog.tsx` + `src/hooks/useVolumeData.ts`
- `src/utils/statsQueries.ts` — helpers puros (chave canônica de exercício, agrupamento por bucket, cálculo Epley reutilizando o já existente).
- Recharts já está no projeto (verificar em `package.json` no build); se faltar, adicionar.

## Sobre o conflito iniciante vs avançado

Sem problema de leitura: as duas tabelas de instância (`exercicios_treino_usuario` e `exercicios_treino_usuario_avancado`) são consultadas em paralelo e unidas no cliente; a origem do card é derivada a implicitamente pelo `id` presente em uma das duas. Os catálogos (`exercicios_iniciantes` / `exercicios_avancados`) têm as mesmas colunas de músculo, então o pipeline de volume é uniforme. Não é preciso filtrar por nível do programa ativo — cada série já traz seu contexto pela FK.

## Fora do escopo desta rodada

- Popular auxiliary_muscle_1..4 (colunas nascem vazias; volume ignora nulls).
- Nomes exibidos "bonitos" para PRs de exercícios custom já vêm de `exercicios_custom.nome`.

## Passos de verificação
1. Migration aplicada (`profiles` + colunas de músculo auxiliar).
2. `tsgo` limpo.
3. Sanidade visual em `/stats`: 4 seções renderizam sem dados vazios estourarem layout.
