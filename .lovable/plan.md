

## Plano: Customizador Avançado + Correções

### 1. Corrigir `ProgramExercisesForm.tsx` — exercícios apenas na semana 1

Envolver o bloco de inserção de exercícios (linhas 350-405) com `if (semana === 1)`. Isso afeta apenas programas **futuramente criados**. Programas existentes (iniciantes ou avançados) já ativos não são afetados, pois o `programLoader` e o `saveCustomizedProgram` já filtram por `ordem_semana = 1`.

### 2. Atualizar `programLoader.ts` para programas avançados

Quando `programa.nivel !== 'iniciante'`, buscar exercícios de `exercicios_treino_avancado` (em vez de `exercicios_treino`), mapeando os campos extras (`rer`, `metodo_especial`, `modelo_feedback`). Também carregar `rer_por_semana` dos mesociclos e incluí-lo no `LoadedProgramData`.

Novo campo em `LoadedProgramData`:
```typescript
rerPerWeekPerMesocycle?: Record<number, Record<number, string>>; // { mesocycleNum: { weekNum: rerValue } }
```

### 3. Atualizar `ProgramCustomize.tsx` para renderizar kanban correto

Verificar `programData.programLevel`. Se avançado, renderizar `ExerciseKanbanAdvanced` em vez de `ExerciseKanban`, com as seguintes diferenças do editor:
- **Sem** seletor de RER por semana (é configuração do dev/admin)
- **Sem** campos RER e Feedback no card do exercício
- **Com** campo Métodos Especiais editável pelo usuário
- Campos visíveis no card: Cabeçalho, seletor de exercício, séries, repetições (faixas avançadas), Métodos Especiais

Isso implica criar uma prop `hideEditorFields` (ou `customizerMode: true`) no `ExerciseKanbanAdvanced` e `ExerciseDetailsAdvanced` para ocultar RER, Feedback e o grid de RER por semana.

### 4. Nova migration: tabela `exercicios_treino_usuario_avancado`

Estrutura revisada conforme feedback:

```sql
CREATE TABLE public.exercicios_treino_usuario_avancado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_usuario_id uuid NOT NULL REFERENCES treinos_usuario(id) ON DELETE CASCADE,
  exercicio_original_id uuid REFERENCES exercicios_avancados(id),
  card_original_id uuid,
  nome text NOT NULL,
  grupo_muscular text NOT NULL,
  series numeric NOT NULL,
  repeticoes text,
  ordem integer NOT NULL,
  oculto boolean NOT NULL DEFAULT false,
  concluido boolean NOT NULL DEFAULT false,
  peso numeric,
  observacao text,
  -- Campos avançados
  rer text DEFAULT 'do_microciclo',
  metodo_especial text,
  modelo_feedback text DEFAULT 'ARA/ART',
  -- Substituição
  substituicao_neste_treino boolean NOT NULL DEFAULT false,
  substituto_oficial_id uuid,
  substituto_custom_id uuid,
  substituto_nome text,
  -- Configuração
  incremento_minimo numeric,
  configuracao_inicial boolean DEFAULT false,
  -- Feedback (colunas numéricas)
  avaliacao_pump numeric,       -- ARA: pump
  avaliacao_fadiga numeric,     -- ARA: fadiga
  avaliacao_dor numeric,        -- ART: dor
  avaliacao_recuperacao numeric, -- ART: recuperação
  avaliacao_performance numeric, -- AMP: performance
  data_avaliacao timestamptz,
  -- Metadados
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Removidos** em relação ao plano anterior: `reps_programadas`, `primary_muscle`, `secondary_muscle`, `video_url` (consultados diretamente em `exercicios_avancados` quando necessário).

RLS: mesmas políticas de `exercicios_treino_usuario` (dono CRUD via join com `treinos_usuario` → `programas_usuario`, dev ALL).

### 5. Atualizar `programCustomizer.ts` — salvar programa avançado

No `saveCustomizedProgram`, verificar o nível do programa. Se avançado:
- Inserir em `exercicios_treino_usuario_avancado` em vez de `exercicios_treino_usuario`
- Incluir `rer`, `metodo_especial`, `modelo_feedback` do template
- `card_original_id` referencia o exercício da semana 1 em `exercicios_treino_avancado`

A `rer_por_semana` **não** precisa ser copiada para uma tabela do usuário — ela é lida diretamente de `mesociclos` (tabela do programa original) durante o workout, usando `ordem_semana` para resolver o valor.

### 6. Sobre a questão "salvar RER resolvida vs. do_microciclo"

Manter `rer = 'do_microciclo'` na tabela `exercicios_treino_usuario_avancado` e resolver dinamicamente no workout. Vantagens:
- Se o dev/admin alterar o `rer_por_semana` no mesociclo, todos os exercícios refletem automaticamente
- Menos dados redundantes
- Exercícios com RER fixo (ex: "Falha", "3") continuam com o valor direto

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| Migration SQL | Tabela `exercicios_treino_usuario_avancado` + RLS |
| `ProgramExercisesForm.tsx` | Exercícios apenas na semana 1 (`if (semana === 1)`) |
| `programLoader.ts` | Buscar de `exercicios_treino_avancado` se avançado; incluir `rerPerWeekPerMesocycle` |
| `ProgramCustomize.tsx` | Renderizar `ExerciseKanbanAdvanced` para avançados |
| `ExerciseKanbanAdvanced.tsx` | Prop para ocultar grid de RER por semana no modo customize |
| `ExerciseDetailsAdvanced.tsx` | Prop para ocultar campos RER e Feedback no modo customize |
| `programCustomizer.ts` | Branch para salvar em `exercicios_treino_usuario_avancado` |

