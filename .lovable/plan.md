

## Plano: ART com detecção por músculos trabalhados

### Lógica de detecção (hook `useARTCheck.ts`)

Ao abrir um workout avançado:

1. **Listar músculos do workout atual**: Para cada exercício do workout, buscar `exercicio_original_id` → lookup em `exercicios_avancados` para obter `primary_muscle`, `secondary_muscle`, `tertiary_muscle`, `quaternary_muscle`. Criar um Set de todos os músculos não-nulos.

2. **Buscar exercícios pendentes de ART**: Exercícios concluídos em workouts anteriores (mesmo `programa_usuario_id`, `ordem_semana` anterior OU mesmo `ordem_semana` com `ordem_dia` anterior) onde:
   - `avaliacao_pump IS NOT NULL` (ARA feito)
   - `avaliacao_dor IS NULL` (ART pendente)

3. **Filtrar por coincidência de músculos**: Para cada exercício pendente, buscar seus músculos via `exercicios_avancados` (usando `exercicio_original_id`). Se houver interseção com o Set do passo 1, incluir na lista de pendentes.

4. **Retornar lista** com nome do exercício, grupo muscular e músculos coincidentes.

Performance: ~2-3 queries leves (exercícios do workout atual, exercícios pendentes anteriores, lookup de músculos). Dataset por usuário é pequeno, sem impacto perceptível.

### Componente `ARTFeedbackDialog.tsx`

Dialog obrigatória no início do workout. Lista exercícios pendentes agrupados por grupo muscular:

```text
ART - Avalie sua dor muscular e recuperação após os exercícios do treino anterior:

[Grupo Muscular] - [Nome do Exercício]
  ○ Ainda Dolorido/Não recuperado (-0.5)
  ○ Alguma dor/100% recuperado (0)
  ○ Nenhuma dor/200% recuperado (+0.5)
```

3 opções tipo toggle (mesmo padrão visual do ARA). Botão Salvar habilitado quando todos avaliados.

### Salvamento e cálculo

Ao salvar:
1. Para cada exercício avaliado, update `avaliacao_dor` na linha do exercício do **workout anterior**
2. Recalcular séries: `rawSeries = series + pump + fadiga + art`, arredondar (≤.5→floor, ≥.51→ceil)
3. Atualizar séries da próxima semana (mesma lógica de busca do ARA com fallback `card_original_id` → `exercicio_original_id` → `substituto_custom_id`)

### Fluxo em `Workout.tsx`

Após `fetchAdvancedExercises`, chamar o hook `useARTCheck`. Se `pendingExercises.length > 0`, exibir `ARTFeedbackDialog` antes de liberar o workout.

### Arquivos

| Arquivo | Tipo |
|---|---|
| `src/components/workout/ARTFeedbackDialog.tsx` | Novo |
| `src/hooks/useARTCheck.ts` | Novo |
| `src/pages/Workout.tsx` | Alterado (integrar ART check + dialog) |

### Garantia de não-interferência

- Só dispara quando `isAdvanced === true`
- Nenhum arquivo do sistema iniciante é modificado
- Fluxo iniciante em `Workout.tsx` permanece intacto

