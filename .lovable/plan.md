# Corrigir texto de "Progressão sugerida" no card intermediário (STAR)

## Problema

No nível intermediário (STAR), os **inputs de carga e reps** já usam a nova progressão mínima baseada em Epley (`useStarProgression`). Porém o **texto de progressão sugerida no cabeçalho** do card (`ExerciseHeaderAdvanced`) ainda mostra a lógica do avançado — três opções rotuladas "mais fácil / intermediário / mais difícil", vindas de `epleyResult`.

O cabeçalho deve, no intermediário, mostrar a progressão mínima:
- Mesmo formato do avançado (linha base + linha(s) de opção com carga × reps – 1RMe – percentual de evolução).
- Rótulo **"progressão mínima"** em vez de mais fácil/intermediário/mais difícil.
- Em caso de **empate no 1RMe**, mostrar todas as opções empatadas (duas ou mais), mesmo que os inputs continuem sendo preenchidos sempre com a carga mais pesada.

## Mudanças

### 1. `src/utils/starProgression.ts`
- `computeStarProgression` hoje retorna apenas o melhor único (`best`). Alterar para também coletar **todas as opções empatadas** no menor aumento positivo de 1RMe.
- Retornar uma estrutura com:
  - `base` (peso, reps, 1RMe da semana anterior);
  - `options[]`: cada uma com `weight`, `reps`, `estimated1RM`, `percentIncrease` (= `(est/base1RM - 1) * 100`), ordenadas por carga; a implementada nos inputs continua sendo a de **maior carga** entre as empatadas.
- Manter compatibilidade: o "suggested" implementado nos inputs = opção de maior carga.

### 2. `src/hooks/useStarProgression.ts`
- Expandir `StarProgressionHookResult` para incluir `base { weight, reps, estimated1RM }` e `options[]` (mesmo shape usado no cabeçalho), além dos já existentes `suggestedWeight`/`suggestedReps`/`fromDeloadBase`.
- No caminho normal, preencher `options` a partir do novo retorno de `computeStarProgression`.
- No caminho de retorno pós-deload (repete `progressao_base_*`) e nos fallbacks (sem aumento positivo), montar uma `options` de um único item para o cabeçalho refletir corretamente.

### 3. `src/components/workout/ExerciseCardAdvanced.tsx`
- Passar o resultado STAR para o cabeçalho quando `isStar` (ex.: nova prop `starResult` no `ExerciseHeaderAdvanced`, mantendo `epleyResult` para o avançado).

### 4. `src/components/workout/components/ExerciseHeaderAdvanced.tsx`
- Aceitar `starResult` e um flag/`nivel` para decidir a fonte.
- Quando intermediário: renderizar o bloco de progressão a partir de `starResult` — linha base igual ao avançado e, para cada opção, `Xkg x Y reps – 1RMe = Z kg (progressão mínima – P%)`.
- Quando há múltiplas opções empatadas, listar todas (cada uma como uma linha com o ícone `TrendingUp`), todas rotuladas "progressão mínima".
- Avançado permanece exatamente como está.

## Detalhes técnicos

- Empate: definido pela mesma `estimated1RM` dentro de `EPS` (já usado em `starProgression.ts`). Todas as candidatas com esse 1RMe mínimo positivo entram em `options`.
- O preenchimento automático dos inputs (`suggestedWeight`/`suggestedReps`) não muda: continua a opção de maior carga entre as empatadas.
- Sem alterações de banco de dados. Mudança apenas de apresentação + forma do retorno do cálculo/hook STAR.

## Validação

- Abrir um treino intermediário e confirmar que o cabeçalho mostra "progressão mínima" com percentual, coerente com os valores preenchidos nos inputs.
- Construir/simular um caso de empate de 1RMe e verificar que duas ou mais opções aparecem, com os inputs preenchidos pela carga mais pesada.
- Confirmar que o avançado continua mostrando mais fácil/intermediário/mais difícil sem mudanças.
- Rodar typecheck.
