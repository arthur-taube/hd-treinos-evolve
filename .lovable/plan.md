

## Plano: Cronômetro horizontal integrado aos Workouts

### Componente `WorkoutTimer.tsx`

Barra horizontal retrátil, posicionada acima do `BottomNav`, com layout compacto:

```text
Recolhido:
                         ⏱ ← botão semicircular toggle

Expandido:
┌──────────────────────────────────────────────────┐
│ [Cronômetro]                                     │
│ [  Timer  ]   (-5s)  01:30  (+15s)  [▶] [⟲]    │
└──────────────────────────────────────────────────┘
```

- **Esquerda**: Toggle de modo empilhado verticalmente (Cronômetro / Timer)
- **Centro**: Display do tempo (MM:SS.cs para stopwatch, MM:SS para timer)
- **Direita**: Botões de controle (Iniciar/Parar, Zerar)
- **Timer**: botão -5s antes do display, +15s depois do display
- **Timer inicia em 1:30** por padrão
- Beep via Web Audio API quando timer chega a zero
- Botão semicircular centralizado para expandir/recolher

### Arquivos

| Arquivo | Alteração |
|---|---|
| `src/components/workout/WorkoutTimer.tsx` | Novo componente |
| `src/pages/Workout.tsx` | Importar e renderizar `WorkoutTimer` |

### Detalhes técnicos

- Estado interno: modo, running, tempo, visibilidade
- `useRef` + `setInterval` (10ms stopwatch, 1000ms timer)
- Cleanup no unmount
- Tailwind `transition-all` para animação de expand/collapse
- `z-index` entre conteúdo e BottomNav

