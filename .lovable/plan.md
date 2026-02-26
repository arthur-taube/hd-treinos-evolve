

## Correcao: Carregar Grupos Multiplos e Padronizar Ordem no Editor de Programa do Usuario

### Problema 1: Grupos multiplos nao carregados
Em `loadUserProgramForCustomize` (programLoader.ts, linhas 299-300), os valores sao hardcoded:
```typescript
allowMultipleGroups: false,
availableGroups: undefined
```
A tabela `exercicios_treino_usuario` nao possui colunas `allow_multiple_groups` nem `available_groups`. Essas informacoes existem apenas na tabela template `exercicios_treino`. E necessario recupera-las cruzando os dados.

### Problema 2: Ordem inconsistente (0 vs 1)
- `exercicios_treino` usa ordem 1-based (1, 2, 3...)
- `exercicios_treino_usuario` usa ordem 0-based (0, 1, 2...) — definido em `saveCustomizedProgram` (linha 257: `ordem: index`) e `updateUserProgram` (linha 394: `ordem: i`)

Confirmado pelos dados:
- Template: ordens 1, 2, 3, 4, 5, 6
- Usuario: ordens 0, 1, 2, 3, 4, 5

### Problema 3: Reordenacao quebra matching
Se o usuario reordenar exercicios no kanban, a `ordem` muda e nao serve mais para identificar qual card original (`exercicios_treino`) corresponde a cada exercicio do usuario. O `exercicio_original_id` (que aponta para `exercicios_iniciantes`) e compartilhado entre as duas tabelas e pode ser usado para matching, mas nao e 100% robusto se houver dois exercicios identicos no mesmo dia.

### Solucao

#### 1. `src/utils/programLoader.ts` — `loadUserProgramForCustomize`
Apos buscar os exercicios do usuario, buscar tambem os `exercicios_treino` do programa original (semana 1) para recuperar `allow_multiple_groups` e `available_groups`:

```typescript
// Buscar exercicios originais do template para recuperar allow_multiple_groups/available_groups
const { data: treinosOriginais } = await supabase
  .from('treinos')
  .select('id, ordem_dia')
  .eq('programa_id', programaOriginal.id)
  .eq('ordem_semana', 1);

const treinoOriginalIds = treinosOriginais?.map(t => t.id) || [];

const { data: exerciciosOriginais } = await supabase
  .from('exercicios_treino')
  .select('treino_id, exercicio_original_id, allow_multiple_groups, available_groups')
  .in('treino_id', treinoOriginalIds);
```

Para cada exercicio do usuario, fazer matching pelo `exercicio_original_id` dentro do mesmo dia (via `treinos_usuario.treino_original_id` = `treinos.id`):

```typescript
// Encontrar o exercicio template correspondente
const treinoOriginalId = treino.treino_original_id;
const exercicioTemplate = exerciciosOriginais?.find(
  eo => eo.treino_id === treinoOriginalId && 
        eo.exercicio_original_id === exercicio.exercicio_original_id
);

return {
  // ...demais campos
  allowMultipleGroups: exercicioTemplate?.allow_multiple_groups || false,
  availableGroups: exercicioTemplate?.available_groups || undefined
};
```

#### 2. `src/utils/programCustomizer.ts` — Padronizar ordem para 1-based
Em `saveCustomizedProgram` (linha 257), mudar:
```typescript
ordem: index,     // antes (0-based)
ordem: index + 1, // depois (1-based)
```

Em `updateUserProgram` (linhas 394 e 409), mudar:
```typescript
ordem: i,     // antes (0-based)
ordem: i + 1, // depois (1-based)
```

#### 3. Migracao: corrigir ordens existentes no banco
Executar um UPDATE para incrementar em 1 todas as ordens 0-based existentes em `exercicios_treino_usuario`:
```sql
UPDATE exercicios_treino_usuario SET ordem = ordem + 1 WHERE ordem = 0;
```
Na verdade, para ser seguro, incrementar TODOS os registros que seguem o padrao 0-based. Como o template usa 1-based e o maximo de exercicios por dia e ~6, podemos detectar pelo fato de existir `ordem = 0`:
```sql
-- Incrementar ordem de todos exercicios de treinos que contenham ordem 0
UPDATE exercicios_treino_usuario 
SET ordem = ordem + 1 
WHERE treino_usuario_id IN (
  SELECT DISTINCT treino_usuario_id 
  FROM exercicios_treino_usuario 
  WHERE ordem = 0
);
```

#### 4. Sobre `ordem_original` (nao necessaria por enquanto)
O matching por `exercicio_original_id` + `treino_original_id` (mesmo dia) e suficiente para recuperar os dados do template. A unica situacao onde falharia e se houvesse dois exercicios identicos (mesmo `exercicio_original_id`) no mesmo dia, o que nao ocorre no sistema atual. Se no futuro isso se tornar um risco, podemos adicionar a coluna.

### Detalhes Tecnicos

**Fluxo do matching para grupos multiplos:**
```
exercicios_treino_usuario.exercicio_original_id (ex: UUID do exercicio em exercicios_iniciantes)
  ↕ match com
exercicios_treino.exercicio_original_id (mesmo UUID)
  + filtro por treinos_usuario.treino_original_id = exercicios_treino.treino_id (mesmo dia)
  → recupera allow_multiple_groups e available_groups
```

### Arquivos Modificados
1. `src/utils/programLoader.ts` — `loadUserProgramForCustomize`: buscar e cruzar dados do template
2. `src/utils/programCustomizer.ts` — `saveCustomizedProgram` e `updateUserProgram`: ordem 1-based
3. Migracao SQL — corrigir ordens 0-based existentes

