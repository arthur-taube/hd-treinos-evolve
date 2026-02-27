

## Correcao: Propagacao de Incremento e Configuracao Inicial para Exercicios Custom

### Problema Raiz
Tres pontos causam o bug:

1. **Trigger `propagate_increment_config`** (banco): filtra por `etu.exercicio_original_id = NEW.exercicio_original_id`. Para exercicios custom, `exercicio_original_id` e NULL, e `NULL = NULL` retorna FALSE no Postgres — logo a propagacao nunca ocorre.

2. **`propagateIncrementoMinimo` em `muscleDataLoader.ts`** (linha 50): busca exercicios futuros por `.eq('exercicio_original_id', exercicioOriginalId)`. Para custom, o ID passado e null, entao nada e encontrado.

3. **`triggerProgressionPrecomputation` em `use-exercise-feedback.ts`** (linha 159-168): nao seleciona `substituto_custom_id` do exercicio, entao `customExerciseId` nunca e passado para `precomputeNextExerciseProgression`.

### Solucao

#### 1. Migracao SQL — Corrigir trigger `propagate_increment_config`
Alterar o trigger para tambem propagar via `substituto_custom_id` quando `exercicio_original_id` e NULL:

```sql
CREATE OR REPLACE FUNCTION public.propagate_increment_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
    IF (TG_OP = 'UPDATE' AND (
        OLD.incremento_minimo IS DISTINCT FROM NEW.incremento_minimo OR
        OLD.configuracao_inicial IS DISTINCT FROM NEW.configuracao_inicial
    )) OR (TG_OP = 'INSERT' AND (NEW.configuracao_inicial = TRUE OR NEW.incremento_minimo IS NOT NULL)) THEN
        
        IF NEW.incremento_minimo IS NOT NULL AND (NEW.configuracao_inicial IS NULL OR NEW.configuracao_inicial = FALSE) THEN
            NEW.configuracao_inicial = TRUE;
        END IF;
        
        UPDATE exercicios_treino_usuario etu
        SET 
            incremento_minimo = COALESCE(NEW.incremento_minimo, etu.incremento_minimo),
            configuracao_inicial = CASE 
                WHEN NEW.incremento_minimo IS NOT NULL OR NEW.configuracao_inicial = TRUE THEN TRUE 
                ELSE etu.configuracao_inicial 
            END
        FROM treinos_usuario tu, treinos_usuario tu_source
        WHERE etu.treino_usuario_id = tu.id
        AND NEW.treino_usuario_id = tu_source.id
        AND tu.programa_usuario_id = tu_source.programa_usuario_id
        AND (
            -- Match by exercicio_original_id when available
            (NEW.exercicio_original_id IS NOT NULL AND etu.exercicio_original_id = NEW.exercicio_original_id)
            OR
            -- Match by substituto_custom_id for custom exercises
            (NEW.exercicio_original_id IS NULL AND NEW.substituto_custom_id IS NOT NULL AND etu.substituto_custom_id = NEW.substituto_custom_id)
        )
        AND etu.concluido = FALSE
        AND etu.id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$
```

#### 2. `src/utils/muscleDataLoader.ts` — `propagateIncrementoMinimo`
Aceitar um parametro opcional `customExerciseId` e usar `substituto_custom_id` para buscar exercicios futuros quando `exercicioOriginalId` e null:

```typescript
export const propagateIncrementoMinimo = async (
  exercicioOriginalId: string | null,
  programaUsuarioId: string,
  incrementoMinimo: number,
  customExerciseId?: string | null
): Promise<boolean> => {
  // ...
  // Se exercicioOriginalId e null, buscar por substituto_custom_id
  if (exercicioOriginalId) {
    query = query.eq('exercicio_original_id', exercicioOriginalId);
  } else if (customExerciseId) {
    query = query.eq('substituto_custom_id', customExerciseId);
  } else {
    return true; // sem identificador
  }
  // ...
```

#### 3. `src/hooks/use-exercise-feedback.ts` — `triggerProgressionPrecomputation`
Adicionar `substituto_custom_id` ao select (linha 162) e passa-lo para `precomputeNextExerciseProgression`:

```typescript
const { data: exercise, error } = await supabase
  .from('exercicios_treino_usuario')
  .select(`
    exercicio_original_id,
    substituto_custom_id,
    avaliacao_dificuldade,
    treino_usuario_id,
    treinos_usuario!inner(programa_usuario_id)
  `)
  .eq('id', exerciseId)
  .single();

// ...
await precomputeNextExerciseProgression({
  currentExerciseId: exerciseId,
  exercicioOriginalId: exercise.exercicio_original_id,
  programaUsuarioId: exercise.treinos_usuario.programa_usuario_id,
  avaliacaoDificuldade: exercise.avaliacao_dificuldade,
  avaliacaoFadiga: avaliacaoFadiga,
  customExerciseId: exercise.substituto_custom_id
});
```

#### 4. Verificar chamadas de `propagateIncrementoMinimo`
Localizar onde `propagateIncrementoMinimo` e chamado e garantir que `customExerciseId` seja passado.

### Arquivos Modificados
1. Migracao SQL — trigger `propagate_increment_config` corrigido
2. `src/utils/muscleDataLoader.ts` — suporte a `customExerciseId`
3. `src/hooks/use-exercise-feedback.ts` — selecionar e passar `substituto_custom_id`
4. Quaisquer chamadores de `propagateIncrementoMinimo` que precisem passar o novo parametro

