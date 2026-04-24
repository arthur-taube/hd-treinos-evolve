

## Plano: Corrigir cálculo de séries no sistema avançado

### Problemas identificados

**1. Decimais descartados na gravação**
Em `useExerciseActionsAdvanced.ts` (saveARAFeedback, saveAMPFeedback) e `useARTCheck.ts` (saveARTFeedback), o código calcula `rawSeries` (decimal) e aplica `Math.floor`/`Math.ceil` antes de salvar. A coluna `series` na tabela já é `numeric`, então o decimal é perdido por código, não por schema.

Exemplo: pump=0 + fadiga=0.75 + dor=0.25 = +1.0 (ok), mas pump=0.25 + fadiga=0 + dor=0 = +0.25 → arredonda para 0 e some.

**2. Atualização pulada quando delta = 0**
A condição `if (newSeries !== currentSeries && newSeries >= 1)` bloqueia o update quando a soma das avaliações é 0. Como a semana seguinte vem do template com o valor original (3), ela nunca recebe o valor acumulado da semana avaliada (4). Resultado: regressão.

### Solução

**Mudança 1 — Persistir o valor decimal acumulado (raw)**

Em vez de arredondar antes de salvar, salvamos o `rawSeries` (decimal) na coluna `series` da próxima semana. O arredondamento (≤.5 desce, ≥.51 sobe) acontece apenas na exibição/uso no frontend, igual ao iniciante.

Arquivos:
- `src/components/workout/hooks/useExerciseActionsAdvanced.ts` — `saveARAFeedback` e `saveAMPFeedback`: trocar `newSeries` arredondado por `rawSeries` decimal no `.update({ series: ... })`.
- `src/hooks/useARTCheck.ts` — `saveARTFeedback`: mesma troca. Aqui o `currentSeries` usado é `exercise.series` (a série da semana avaliada) — manter, pois ARA já gravou `current + pump + fadiga` na próxima semana e o ART recalcula corretamente `current + pump + fadiga + art`.

**Mudança 2 — Sempre propagar o valor, mesmo com delta 0**

Remover `newSeries !== currentSeries` da condição. Manter apenas `rawSeries >= 1` como guarda mínima.

```ts
// Antes
if (newSeries !== currentSeries && newSeries >= 1) { ...update... }

// Depois
if (rawSeries >= 1) { ...update({ series: rawSeries })... }
```

Isso garante que a semana seguinte sempre herde o valor da semana avaliada, mesmo quando todas as avaliações forem 0 (o template inicial 3 é sobrescrito por 4 acumulado).

**Mudança 3 — Aplicar arredondamento no frontend para exibição**

Onde o número de séries é lido para gerar os campos de série no `ExerciseCardAdvanced` / `ExerciseSetsAdvanced`, aplicar o mesmo arredondamento do iniciante:

```ts
const displaySeries = (series % 1 > 0.5) ? Math.ceil(series) : Math.floor(series);
```

Investigar onde `series` é convertido em número de inputs no card avançado e aplicar a função utilitária. Provavelmente em `useExerciseStateAdvanced.ts` ao gerar o array `sets`.

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/components/workout/hooks/useExerciseActionsAdvanced.ts` | Salvar decimal raw + remover guard `!== currentSeries` em ARA e AMP |
| `src/hooks/useARTCheck.ts` | Salvar decimal raw + remover guard `!== currentSeries` em ART |
| `src/components/workout/hooks/useExerciseStateAdvanced.ts` (a confirmar) | Arredondar `series` ao gerar os inputs de série exibidos |

### Notas

- Schema do banco já é `numeric` — nenhuma migration necessária.
- Os exercícios avançados já criados com valor inteiro continuam funcionando; o decimal só passa a aparecer a partir das próximas avaliações.
- Comportamento alinhado com o sistema iniciante: banco guarda valor decimal acumulado, frontend arredonda só para exibir.

