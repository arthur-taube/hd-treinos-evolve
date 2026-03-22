

## Plano: ARA — Avaliação das Respostas Agudas

### Conceito

Ao concluir um exercício avançado, abre-se uma dialog obrigatória com duas avaliações (Pump e Fadiga) na mesma janela, usando controles deslizantes com legendas e descrições. Os valores salvos influenciarão o ajuste de séries.

### Valores e labels

**Pump** (slider com 2 pontos):
- Inexistente = +0.25
- Presente = 0

**Fadiga** (slider com 3 pontos):
- Baixa = +0.75
- Boa = 0
- Extrema = -1

**Score ARA** = séries atuais + pump_value + fadiga_value, arredondando: ≤ .5 → floor, ≥ .51 → ceil.

### Novo componente: `ARAFeedbackDialog.tsx`

Em `src/components/workout/ARAFeedbackDialog.tsx`. Dialog obrigatória (sem fechar por fora/ESC) com:

- Título: "Avaliação das Respostas Agudas"
- Subtítulo: nome do exercício
- Seção **Pump**: slider de 2 pontos (Inexistente / Presente), descrição abaixo do selecionado
- Seção **Fadiga**: slider de 3 pontos (Baixa / Boa / Extrema), descrição abaixo do selecionado
- Botão "Salvar" (habilitado quando ambos selecionados)
- Layout compacto para caber em mobile

Implementação com botões toggle (não slider HTML nativo) para melhor UX mobile — cada opção é um botão com label, e a descrição aparece abaixo ao selecionar (mesmo padrão do `FeedbackDialog` existente).

### Fluxo no `ExerciseCardAdvanced.tsx`

1. `handleExerciseComplete` → marca exercício como concluído → abre `showARADialog`
2. Usuário preenche Pump + Fadiga → clica Salvar
3. `saveARAFeedback(pump, fadiga)` → salva `avaliacao_pump` e `avaliacao_fadiga` em `exercicios_treino_usuario_avancado`
4. Dialog fecha

### Alterações no `useExerciseActionsAdvanced.ts`

Modificar `handleExerciseComplete`:
- Em vez de fechar direto, retornar `true` para sinalizar que o exercício foi concluído (o componente pai abre a dialog ARA)

Nova função `saveARAFeedback(pump: number, fadiga: number)`:
- Update em `exercicios_treino_usuario_avancado` com `avaliacao_pump`, `avaliacao_fadiga`, `data_avaliacao`
- Toast de confirmação

### Estado no `ExerciseCardAdvanced.tsx`

- `showARADialog: boolean` — controla a dialog
- No `handleExerciseComplete`, após sucesso, `setShowARADialog(true)` (apenas se `modelo_feedback` inclui "ARA")

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/workout/ARAFeedbackDialog.tsx` | Novo — dialog com Pump + Fadiga |
| `src/components/workout/ExerciseCardAdvanced.tsx` | Estado `showARADialog`, abre após concluir exercício, renderiza dialog |
| `src/components/workout/hooks/useExerciseActionsAdvanced.ts` | Nova função `saveARAFeedback`, ajuste no `handleExerciseComplete` para sinalizar abertura da dialog |

