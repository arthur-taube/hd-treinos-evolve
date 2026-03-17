

## Plano revisado: RER por microciclo + novos campos no card (tabelas separadas)

### Arquitetura de tabelas

O sistema avançado usará tabelas próprias, sem alterar as tabelas do sistema iniciante. A tabela `exercicios_treino` (iniciante) permanece intacta.

```text
programas (compartilhada)
  └── mesociclos (compartilhada, +coluna rer_por_semana jsonb)
        └── treinos (compartilhada, usada para ambos os níveis)
              ├── exercicios_treino (apenas iniciante - sem mudanças)
              └── exercicios_treino_avancado (NOVA - apenas avançado)
```

### Migration SQL

**1. Nova tabela `exercicios_treino_avancado`:**
```sql
CREATE TABLE public.exercicios_treino_avancado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_id uuid NOT NULL REFERENCES treinos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  grupo_muscular text NOT NULL,
  series integer NOT NULL,
  repeticoes text,
  ordem integer NOT NULL,
  oculto boolean NOT NULL DEFAULT false,
  exercicio_original_id uuid REFERENCES exercicios_avancados(id),
  allow_multiple_groups boolean DEFAULT false,
  available_groups text[],
  rer text DEFAULT 'do_microciclo',
  metodo_especial text,
  modelo_feedback text DEFAULT 'ARA/ART',
  created_at timestamptz NOT NULL DEFAULT now()
);
```
RLS: mesma lógica das tabelas de treino (devs ALL, autenticados SELECT).

**2. Tabela `metodos_especiais`** (referência/catálogo):
```sql
CREATE TABLE public.metodos_especiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: SELECT para authenticated
-- INSERT dos 10 métodos listados pelo usuário
```

**3. Coluna `rer_por_semana` em `mesociclos`:**
```sql
ALTER TABLE public.mesociclos ADD COLUMN rer_por_semana jsonb;
```
Formato: `{"1": "4-5", "2": "3-4", "3": "2-3", "4": "1-2"}`

### Mudanças no frontend

**1. `types.ts`** — 3 novos campos opcionais no `Exercise`:
- `rer?: string` (default `"do_microciclo"`)
- `specialMethod?: string`
- `feedbackModel?: string` (default `"ARA/ART"`)

**2. `ExerciseKanbanAdvanced.tsx`** — Seletores de RER por semana:
- Abaixo do header "Mesociclo X de Y / Duração: [X]", grid de `<Select>` (um por semana)
- Opções: `5, 4-5, 4, 3-4, 3, 2-3, 2, 1-2, 1, 0-1, 0, 0-Falha, Falha`
- Estado `rerPerWeek: Record<number, string>`, propagado via novo callback `onRerPerWeekUpdate`

**3. `ExerciseDetailsAdvanced.tsx`** — 3 novos selects abaixo de Séries/Repetições:
- **RER**: "Do microciclo" (padrão), Falha, 0, 1, 2, 3, 4, 5
- **Método Especial**: carregado da tabela `metodos_especiais` (vazio = séries tradicionais)
- **Feedback**: "ARA/ART" (padrão) ou "AMP"

**4. `ExerciseCardAdvanced.tsx`** — fetch da tabela `metodos_especiais` (com cache module-level, mesmo padrão do repsRanges)

**5. `ProgramExercisesForm.tsx`** — Alterações no save:
- Estado `rerPerWeek` por mesociclo, recebido via callback
- No `createMesocyclesAndWorkouts`: incluir `rer_por_semana` no insert do mesociclo
- Para programas avançados, inserir em `exercicios_treino_avancado` (em vez de `exercicios_treino`), incluindo `rer`, `metodo_especial`, `modelo_feedback`

### Como o workout buscará o RER do microciclo

Quando o exercício tem `rer = 'do_microciclo'`, o workout fará:
1. Buscar `ordem_semana` do treino atual
2. Buscar `rer_por_semana` do mesociclo correspondente
3. Ler `rer_por_semana[ordem_semana]` para obter o valor RER alvo daquela semana

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| Migration SQL | Tabela `exercicios_treino_avancado`, `metodos_especiais`, coluna em `mesociclos` |
| `types.ts` | +3 campos no Exercise |
| `ExerciseKanbanAdvanced.tsx` | Seletores RER por semana + estado + callback |
| `ExerciseDetailsAdvanced.tsx` | +3 selects (RER, Método, Feedback) |
| `ExerciseCardAdvanced.tsx` | Fetch métodos especiais com cache |
| `ProgramExercisesForm.tsx` | Estado rerPerWeek, save em tabela avançada separada |

