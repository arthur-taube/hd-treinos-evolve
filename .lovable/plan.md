

## Adicionar/Remover Series Extra Durante o Workout

### Objetivo
Permitir que o usuario adicione series extras a um exercicio durante o treino, com opcao de remover series adicionadas, gravando a alteracao no banco somente ao concluir o exercicio.

### Arquivos a Modificar

#### 1. `src/components/workout/hooks/useExerciseState.ts`
- Adicionar estado `originalSetCount` (inicializado junto com `sets` no useEffect, valor = numero de series arredondado)
- Criar funcao `addSet()`: adiciona novo item ao array `sets` com `number` sequencial, `weight: null`, `reps: null`, `completed: false`
- Criar funcao `removeSet(index)`: remove a serie do array e renumera os `number` das series restantes
- Exportar `originalSetCount`, `addSet`, `removeSet`

#### 2. `src/components/workout/components/ExerciseSets.tsx`
- Receber novas props: `onAddSet`, `onRemoveSet`, `originalSetCount`, `exerciseConcluido`
- Adicionar botao "+ Adicionar mais 1 serie" (estilo texto/link discreto) entre a ultima linha de serie e a area de notas/concluir
  - Escondido quando exercicio ja esta concluido
- Mostrar `AlertDialog` de confirmacao ao clicar: "Tem certeza que deseja realizar mais uma serie para este exercicio?"
- Para cada serie onde `set.number > originalSetCount` e `set.completed === false`, exibir um botao "X" (icone `X` do lucide-react) ao lado do botao de conclusao (check) na mesma celula da coluna "Concluir"
  - Ao clicar no "X", remove a serie imediatamente (sem confirmacao)

#### 3. `src/components/workout/hooks/useExerciseActions.ts`
- Na funcao `handleExerciseComplete`, antes de chamar `onExerciseComplete`:
  - Comparar `sets.length` com `originalSetCount` (recebido como novo parametro do hook)
  - Se diferente, fazer `supabase.from('exercicios_treino_usuario').update({ series: sets.length }).eq('id', exercise.id)` para persistir o novo numero de series

#### 4. `src/components/workout/ExerciseCard.tsx`
- Extrair `addSet`, `removeSet`, `originalSetCount` do `useExerciseState`
- Passar `originalSetCount` como parametro adicional para `useExerciseActions`
- Passar `onAddSet={addSet}`, `onRemoveSet={removeSet}`, `originalSetCount` como props para `ExerciseSets`

### Detalhes Tecnicos

**Estrutura do botao "X" na grid de series:**

A coluna "Concluir" (4a coluna) passara a conter dois elementos lado a lado para series extras: o botao de check e o botao "X". Ambos serao pequenos (h-8 w-8) e ficarao em um `flex` com `gap-1`.

**Logica de renumeracao ao remover:**

```typescript
const removeSet = (index: number) => {
  setSets(prev => {
    const newSets = prev.filter((_, i) => i !== index);
    return newSets.map((set, i) => ({ ...set, number: i + 1 }));
  });
};
```

**Persistencia no banco (somente ao concluir):**

```typescript
// Em handleExerciseComplete, antes de onExerciseComplete:
if (sets.length !== originalSetCount) {
  await supabase
    .from('exercicios_treino_usuario')
    .update({ series: sets.length })
    .eq('id', exercise.id);
}
```

**AlertDialog de confirmacao:**

Usa o `AlertDialog` do Radix ja existente no projeto (`@/components/ui/alert-dialog`).

### Regras de Negocio

1. O botao "+ Adicionar serie" nao aparece se o exercicio ja esta concluido
2. O botao "X" so aparece em series extras (number > originalSetCount) que nao foram concluidas
3. Se o usuario concluiu uma serie extra (marcou check), ele precisa desmarcar antes de poder remover
4. A coluna `series` no banco so e atualizada ao clicar em "Concluir exercicio"
5. Series extras seguem o mesmo fluxo de preenchimento (peso, reps, check) que as originais
