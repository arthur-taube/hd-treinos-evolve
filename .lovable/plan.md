

## Plano: Texto contextual na ARA + Dialog de Método Especial com propagação

### 1. `ARAFeedbackDialog.tsx` — Texto contextual

- Adicionar prop `muscleGroup?: string`
- Abaixo do `DialogDescription` (nome do exercício), inserir:
  `"Como você sentiu o(s) músculo(s) [grupo muscular] após o exercício [nome do exercício]?"`

### 2. `ExerciseCardAdvanced.tsx` — Passar `grupo_muscular` ao ARA dialog

- Passar `muscleGroup={exercise.grupo_muscular}` no `<ARAFeedbackDialog>`

### 3. Novo componente `SpecialMethodDialog.tsx`

Dialog com:
- Fetch da tabela `metodos_especiais` (campos `id`, `nome`, `descricao`)
- Select/dropdown listando os métodos pelo `nome`
- Ao selecionar, exibir `descricao` abaixo do select
- Opção "Nenhum" para remover método especial
- Botões "Cancelar" e "Salvar"

### 4. Ao salvar método especial — Update + propagação futura

Ao salvar:
1. Update `exercicios_treino_usuario_avancado` set `metodo_especial = X` where `id = exerciseId`
2. Propagar para instâncias futuras: update todos os registros em `exercicios_treino_usuario_avancado` que compartilhem o mesmo `card_original_id`, estejam em semanas >= semana atual do mesmo `programa_usuario_id`, e não estejam concluídos

Isso será feito via uma nova função SQL `update_special_method_advanced` que:
- Recebe `p_exercise_id` e `p_method_name` (text, nullable)
- Busca `card_original_id`, `treino_usuario_id` do exercício
- Busca `programa_usuario_id` e `ordem_semana` do treino
- Atualiza o exercício atual + todos os futuros não concluídos com mesmo `card_original_id`

### 5. `ExerciseCardAdvanced.tsx` — Integrar dialog

- Adicionar estado `showMethodDialog`
- `handleMethodChange` → `setShowMethodDialog(true)`
- Renderizar `<SpecialMethodDialog>` com `exerciseId`, `currentMethod`, `onSave`, `onClose`
- Após salvar com sucesso, reload da página (mesmo padrão da substituição)

### Arquivos

| Arquivo | Alteração |
|---|---|
| Migration SQL | Nova função `update_special_method_advanced` |
| `src/components/workout/ARAFeedbackDialog.tsx` | Prop `muscleGroup` + texto contextual |
| `src/components/workout/SpecialMethodDialog.tsx` | Novo componente |
| `src/components/workout/ExerciseCardAdvanced.tsx` | Integrar ambos os dialogs |

