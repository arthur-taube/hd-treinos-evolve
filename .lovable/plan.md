

## Menu de Opcoes nos Cards de Treino + Logica de Progressao para Exercicios Pulados

### Objetivo
Adicionar menu de opcoes (dropdown) em cada card de treino na pagina Active Program com "Pular" e "Reiniciar", garantindo que exercicios pulados passem pela calculadora de progressao com avaliacoes neutras (sem alteracao de carga/series).

### 1. Migracao: coluna `pulado` em `treinos_usuario`
- Adicionar `pulado boolean NOT NULL DEFAULT false`

### 2. `src/pages/ActiveProgram.tsx` - UI e Logica

**Layout dos cards:**
- Icone de status (CheckCircle/XCircle) movido para area inferior do card, tamanho h-6 w-6
- Menu DropdownMenu (icone MoreVertical) no canto superior direito
- `e.stopPropagation()` no botao do menu para nao navegar ao workout

**Estilos por estado:**
- Pendente: `border-primary/20` (sem mudanca)
- Concluido: `border-green-400 bg-green-900/30` + CheckCircle verde (embaixo)
- Pulado: `border-red-400 bg-red-900/30 opacity-80` + XCircle vermelho (embaixo)

**Opcoes do menu:**
- "Pular este treino" - habilitado se `!concluido && !pulado`
- "Reiniciar este treino" - habilitado se `concluido || pulado`

**Dialogs de confirmacao (AlertDialog):**
- Pular: "Tem certeza que deseja pular este treino sem faze-lo?" / "Cancelar" / "Sim, pular"
- Reiniciar: "Tem certeza que deseja reiniciar este treino? Seus dados anteriores serao perdidos." / "Cancelar" / "Sim, reiniciar agora"

**Interface atualizada:**
```typescript
interface TreinoUsuario {
  id: string;
  treino_original_id: string;
  nome: string;
  ordem_semana: number;
  concluido: boolean;
  pulado: boolean;
  data_concluido: string | null;
}
```

### 3. Logica de "Pular Treino"

Quando um workout inteiro e pulado, todos os exercicios dentro dele devem:
1. Ser marcados como concluidos
2. Receber avaliacoes neutras (dificuldade = "muito_pesado", fadiga = 0)
3. Passar individualmente pela calculadora de progressao

```typescript
const handleSkipWorkout = async (treinoId: string) => {
  // 1. Buscar todos os exercicios do treino (nao concluidos)
  const { data: exercicios } = await supabase
    .from('exercicios_treino_usuario')
    .select('id, exercicio_original_id, substituto_custom_id, treino_usuario_id')
    .eq('treino_usuario_id', treinoId)
    .eq('concluido', false);

  if (exercicios && exercicios.length > 0) {
    // 2. Marcar todos exercicios como concluidos com avaliacoes neutras
    await supabase
      .from('exercicios_treino_usuario')
      .update({
        concluido: true,
        avaliacao_dificuldade: 'muito_pesado',
        avaliacao_fadiga: 0,
        avaliacao_dor: 0,
        data_avaliacao: new Date().toISOString()
      })
      .eq('treino_usuario_id', treinoId)
      .eq('concluido', false);

    // 3. Buscar programa_usuario_id
    const { data: treino } = await supabase
      .from('treinos_usuario')
      .select('programa_usuario_id')
      .eq('id', treinoId)
      .single();

    // 4. Para cada exercicio, rodar progressao individualmente
    if (treino) {
      for (const ex of exercicios) {
        await precomputeNextExerciseProgression({
          currentExerciseId: ex.id,
          exercicioOriginalId: ex.exercicio_original_id,
          programaUsuarioId: treino.programa_usuario_id,
          avaliacaoDificuldade: 'muito_pesado',
          avaliacaoFadiga: 0,
          customExerciseId: ex.substituto_custom_id
        });
      }
    }
  }

  // 5. Marcar treino como pulado e concluido
  await supabase
    .from('treinos_usuario')
    .update({
      pulado: true,
      concluido: true,
      data_concluido: new Date().toISOString()
    })
    .eq('id', treinoId);

  // 6. Atualizar estado local
  setTreinos(prev => prev.map(t =>
    t.id === treinoId
      ? { ...t, pulado: true, concluido: true, data_concluido: new Date().toISOString() }
      : t
  ));
};
```

**Por que isso funciona sem erros:** `getDifficultyValue('muito_pesado')` retorna 0 e `avaliacaoFadiga = 0` faz `newSets = currentSets + 0`. O resultado e: mesmo peso, mesmas reps, mesmas series para a semana seguinte. Os valores sao copiados identicos (mas nao nulos) para o proximo exercicio.

### 4. Logica de "Reiniciar Treino"

**SEM deletar series_exercicio_usuario** (mantendo historico):

```typescript
const handleRestartWorkout = async (treinoId: string) => {
  // 1. Resetar exercicios: limpar avaliacoes e status
  await supabase
    .from('exercicios_treino_usuario')
    .update({
      concluido: false,
      avaliacao_dificuldade: null,
      avaliacao_fadiga: null,
      avaliacao_dor: null,
      data_avaliacao: null
    })
    .eq('treino_usuario_id', treinoId);

  // 2. Resetar treino
  await supabase
    .from('treinos_usuario')
    .update({
      concluido: false,
      pulado: false,
      data_concluido: null
    })
    .eq('id', treinoId);

  // 3. Atualizar estado local
  setTreinos(prev => prev.map(t =>
    t.id === treinoId
      ? { ...t, concluido: false, pulado: false, data_concluido: null }
      : t
  ));
};
```

**Sobre a progressao ao reiniciar:** Quando o usuario refizer o treino e concluir cada exercicio, o fluxo normal de `triggerProgressionPrecomputation` vai rodar novamente e sobrescrever os valores pre-calculados da semana seguinte. `findNextExerciseInstance` busca o proximo exercicio com `concluido=false`, que sera o da semana seguinte (ja que esse exercicio, ao ser concluido, volta a ser `concluido=true`). Os valores de peso/reps/series da semana seguinte serao recalculados com as novas avaliacoes reais do usuario. Nao ha risco de erro nesse fluxo.

**Sobre manter series_exercicio_usuario:** O RPC `save_series` usa upsert (INSERT ou UPDATE com base em `exercicio_usuario_id + numero_serie`). Quando o usuario refizer as series, os registros antigos serao atualizados (nao duplicados). O historico antigo sera sobrescrito naturalmente, mas nao havera registros orfaos.

### 5. Calculo de progresso do programa
`getProgramProgress()` ja conta `treinos.filter(t => t.concluido)` - como treinos pulados tem `concluido=true`, serao contados automaticamente.

### Arquivos Modificados
1. Nova migracao SQL - coluna `pulado`
2. `src/pages/ActiveProgram.tsx` - menu dropdown, dialogs, handlers, estilos, import de `precomputeNextExerciseProgression`

