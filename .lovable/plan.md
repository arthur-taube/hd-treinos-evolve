
## Plano: Corrigir zoom automático em inputs no mobile

### O problema

Você está certo: o Safari (e outros browsers no iOS) aplicam zoom automático quando um campo de input tem `font-size` menor que **16px**. No código atual, os inputs de peso e reps no workout usam a classe `text-sm` (14px), o que dispara esse comportamento.

### Solução

Duas alterações simples:

**1. Remover `text-sm` dos inputs de workout**

Nos arquivos `ExerciseSets.tsx` e `ExerciseSetsAdvanced.tsx`, os inputs de peso e reps usam `className="w-20 h-8 text-sm"`. Trocar `text-sm` por `text-base` (16px) — tamanho mínimo para evitar o zoom.

**2. Viewport meta tag (segurança extra)**

Adicionar `maximum-scale=1` no `index.html` para prevenir qualquer zoom automático residual:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
```

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/components/workout/components/ExerciseSets.tsx` | `text-sm` → `text-base` nos inputs |
| `src/components/workout/components/ExerciseSetsAdvanced.tsx` | `text-sm` → `text-base` nos inputs |
| `index.html` | Adicionar `maximum-scale=1` ao viewport |
