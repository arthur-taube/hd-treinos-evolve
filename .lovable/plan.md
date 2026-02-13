

## Tornar Dialogs de Feedback Obrigatorios

### Objetivo
Impedir que o usuario feche os dialogs de incremento minimo, dificuldade e fadiga sem fornecer uma resposta, evitando falhas na progressao.

### Mudancas

#### 1. `src/components/workout/FeedbackDialog.tsx`
- Adicionar nova prop `required?: boolean` (default `false`)
- Quando `required = true`:
  - Passar `hideCloseButton={true}` ao `DialogContent` (ja suportado pelo componente)
  - No `Dialog`, usar `onOpenChange` que ignora tentativas de fechar: `onOpenChange={() => {}}` em vez de `onOpenChange={(open) => !open && onClose()}`
  - O `DialogContent` do Radix ja bloqueia interacao fora do dialog (overlay), mas o `onInteractOutside` precisa ser interceptado com `e.preventDefault()` para impedir fechamento ao clicar fora
  - Tambem interceptar `onEscapeKeyDown` com `e.preventDefault()`
- Quando `required = true` e dialog eh de incremento (`isNumericInput`):
  - Adicionar botao "Cancelar" no footer ao lado do "Salvar"
  - Novo prop `onCancel?: () => void` - chamado ao clicar em Cancelar
  - O botao Cancelar fecha o dialog e impede o usuario de iniciar o exercicio

#### 2. `src/components/workout/ExerciseCard.tsx`
- Nos 3 `FeedbackDialog` (dificuldade, fadiga, incremento), passar `required={true}`
- No dialog de incremento, passar `onCancel` que fecha o accordion (fecha o exercicio):
  ```
  onCancel={() => {
    setShowIncrementDialog(false);
    setIsOpen(false);
  }}
  ```

#### 3. `src/components/workout/hooks/useExerciseState.ts`
- Resetar `incrementDialogShown` para `false` quando o dialog de incremento eh cancelado, para que ao reabrir o accordion o dialog apareca novamente
- Exportar funcao `resetIncrementDialogShown` ou ajustar a logica existente:
  - A flag `incrementDialogShown` so deve ser marcada como `true` quando o usuario SALVA o incremento (ja funciona assim via `customSaveIncrementSetting`)
  - Quando o usuario cancela, `incrementDialogShown` deve voltar a `false` para re-exibir ao reabrir

### Detalhes Tecnicos

**Props adicionais no FeedbackDialog:**
```typescript
interface FeedbackDialogProps {
  // ... existentes
  required?: boolean;    // bloqueia fechamento sem resposta
  onCancel?: () => void; // so para incremento - botao cancelar
}
```

**Bloqueio de fechamento no Dialog (quando required=true):**
```typescript
<Dialog open={isOpen} onOpenChange={required ? undefined : (open) => !open && onClose()}>
  <DialogContent
    hideCloseButton={required}
    onInteractOutside={required ? (e) => e.preventDefault() : undefined}
    onEscapeKeyDown={required ? (e) => e.preventDefault() : undefined}
  >
```

**Botao Cancelar (apenas no dialog de incremento):**
```typescript
<DialogFooter>
  {onCancel && (
    <Button variant="outline" onClick={onCancel}>
      Cancelar
    </Button>
  )}
  <Button onClick={handleSubmit} disabled={...}>
    Salvar
  </Button>
</DialogFooter>
```

**Fluxo do Cancelar no incremento:**
1. Usuario abre exercicio (accordion)
2. Dialog de incremento aparece (required)
3. Usuario clica "Cancelar"
4. `onCancel` eh chamado: fecha dialog + fecha accordion (`setIsOpen(false)`)
5. `incrementDialogShown` volta a `false`
6. Ao reabrir o accordion, dialog aparece novamente

### Arquivos Modificados
1. `src/components/workout/FeedbackDialog.tsx` - props `required` e `onCancel`, bloqueio de fechamento
2. `src/components/workout/ExerciseCard.tsx` - passar `required={true}` e `onCancel` nos dialogs
3. `src/components/workout/hooks/useExerciseState.ts` - resetar `incrementDialogShown` ao cancelar

