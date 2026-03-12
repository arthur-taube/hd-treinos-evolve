
Diagnóstico confirmado: o erro não está no UI, está no contrato de dados entre banco e Kanban avançado.

1) Onde o problema ocorre
- No console da sua sessão: `function unnest(text) does not exist` ao chamar `get_distinct_muscle_groups_avancado`.
- Isso prova que `exercicios_avancados.grupo_muscular` está como `text` (ou texto serializado), enquanto a função foi alterada para tratar como array real.
- Consequência em cadeia:
  - `MuscleGroupDialogAdvanced` não recebe grupos e mostra “Nenhum grupo encontrado”.
  - `ExerciseCardAdvanced` usa `.overlaps(...)` (operador de array); com coluna `text`, a busca de exercícios também quebra.

2) Correção recomendada (definitiva e estável)
- Normalizar `exercicios_avancados.grupo_muscular` para `text[]` via migration (sem perder dados):
  - Converter valores simples para `[valor]`.
  - Converter textos serializados (ex.: `["Glúteos","Posterior"]`) para array real.
  - Converter formato `{...}` (Postgres literal), se existir.
- Recriar `get_distinct_muscle_groups_avancado()` com `unnest(...)` (aí sim válido).
- Criar índice GIN em `grupo_muscular` para manter performance do `.overlaps`.

3) Ajustes de frontend
- Manter `ExerciseCardAdvanced` com `.overlaps('grupo_muscular', [exercise.muscleGroup])` (correto para array).
- Em `MuscleGroupDialogAdvanced`, aplicar sanitização leve após RPC (trim + dedupe + sort) para evitar ruído de import.
- Melhorar tratamento de erro no diálogo para diferenciar “sem dados” de “erro de consulta”.

4) Validação que vou executar após implementar
- SQL de verificação:
  - tipo da coluna (`text[]`);
  - amostras convertidas corretamente;
  - retorno da RPC com grupos individuais.
- Fluxo UI ponta a ponta:
  - abrir modal;
  - selecionar grupo simples e múltiplo;
  - confirmar que a lista de exercícios aparece corretamente para cada grupo (incluindo casos como “Glúteos” vs “Glúteos isolado”, com match exato por array e sem colisão por substring).

Se você mantiver `grupo_muscular` como `text`, eu também consigo fazer um “patch de compatibilidade” por parsing em SQL, mas não recomendo: fica mais frágil e difícil de manter. A normalização para `text[]` é o caminho mais seguro.
