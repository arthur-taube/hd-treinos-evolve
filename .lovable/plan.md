

## Correção: Incremento mínimo — aplicação imediata + validação

### 1. Ajuste imediato do peso no exercício atual (`use-exercise-feedback.ts`)

Em `saveIncrementSetting`, após salvar o novo incremento:
1. Buscar o `peso` atual **deste exercício apenas**
2. Se `peso` não for null, arredondar para o múltiplo válido mais próximo: `Math.round(peso / increment) * increment`
3. Atualizar o `peso` **apenas neste exercício** (sem propagação — o trigger já propaga o `incremento_minimo`)

### 2. Validação com confirmação para valores altos (`FeedbackDialog.tsx`)

Manter `maxValue={10}` como está. Adicionar lógica de confirmação no submit do dialog de incremento:

- **Valor > 5 até 10**: Estado de confirmação com texto: *"Isso é bastante coisa! Esse é realmente o MÍNIMO de carga que você consegue aumentar por vez nesse exercício?"*
- **Valor > 10** (digitado manualmente): Estado de confirmação com texto: *"Uou, isso é muito, bro! Tem certeza que o mínimo de carga que você pode aumentar por vez nesse exercício é tudo isso?"*
- Botões: **[Não, corrigir]** (volta ao input) e **[Sim, usar esse valor]** (confirma)

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/hooks/use-exercise-feedback.ts` | Em `saveIncrementSetting`: buscar peso atual, arredondar para múltiplo do novo incremento, atualizar peso apenas no exercício atual |
| `src/components/workout/FeedbackDialog.tsx` | Novo estado `confirmationMessage`. Ao submeter incremento >5, mostra tela de confirmação antes de chamar `onSubmit` |

Sem migrations. Sem propagação de peso. Apenas 2 arquivos.

