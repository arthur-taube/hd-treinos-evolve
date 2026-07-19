## Ajuste: piso de 80% entre séries no deload (volume e combinado)

### Problema
No deload de **volume** e **combinado**, cortamos as reps de cada série efetiva pela metade. Quando o exercício usa métodos especiais (Rest Pause, etc.) que já reduzem muito as reps da 2ª série em diante, dividir por 2 chega a 2–4 reps — irrealista para um deload.

### Regra nova
Para os modos **volume** e **combinado** apenas:

- Série 1: mantém o cálculo atual (`ceil(reps_originais / 2)`).
- Série N (N ≥ 2): `deload_reps[N] = max(ceil(reps_originais[N] / 2), ceil(deload_reps[N-1] * 0.8))`

Ou seja, cada série do deload não pode cair mais de 20% em relação à série anterior **do mesmo exercício no próprio deload**. Se o corte pela metade violar esse piso, usa-se 80% da série anterior (arredondando para cima).

O modo **carga** não muda — reps continuam sendo cópia literal do último treino.

### Onde alterar

- `src/utils/deload.ts`
  - `computeDeloadSet` hoje calcula uma série isoladamente, sem saber da anterior. Vou adicionar um helper `applyDeloadRepsFloor(sets, mode)` que, depois de gerar todas as séries do exercício via `computeDeloadSet`, percorre da 2ª em diante e aplica o piso de 80% quando `mode` é `volume` ou `combinado`.
  - Alternativa (mais limpa): expor uma função `computeDeloadExerciseSets(baselineSets, mode, incrementoMinimo)` que já retorna o array final com o piso aplicado. Mantemos `computeDeloadSet` para o caso simples.

- `src/pages/DeloadWorkout.tsx`
  - Trocar o loop que chama `computeDeloadSet` por série pela nova função de exercício, de modo que o piso seja aplicado tanto no cálculo inicial quanto quando o usuário alterna Volume/Carga no cabeçalho.

### Detalhes

- Arredondamento: `ceil` em ambos os lados (metade e 80%) — mantém consistência com o resto do deload.
- Piso mínimo absoluto continua sendo 1 rep (já implícito no `ceil`).
- Séries com `repeticoes` nulas ou 0 no baseline permanecem inalteradas (não temos base para inferir).
- Dias já concluídos não são recalculados (dados já persistidos em `deload_series`).

### Validação
- Exemplo Rest Pause com reps originais [12, 6, 4]:
  - Antes (volume): [6, 3, 2].
  - Depois: série 1 = 6; série 2 = max(ceil(6/2)=3, ceil(6*0.8)=5) = **5**; série 3 = max(ceil(4/2)=2, ceil(5*0.8)=4) = **4**. → [6, 5, 4].
- Exemplo tradicional [10, 10, 10] em volume: série 1 = 5; série 2 = max(5, ceil(5*0.8)=4) = 5; série 3 = 5. Sem regressão.
- Combinado com reps [12, 6, 4]: mesmas reps do exemplo Rest Pause acima; carga cai 50% normalmente.
- Modo carga: reps inalteradas em qualquer cenário.
