

## Plano: Workout Card Avançado + Carregamento de Exercícios Avançados

Este plano cobre duas necessidades: (1) fazer a página Workout carregar exercícios da tabela correta para programas avançados, e (2) criar o card de exercício avançado com o novo layout.

### Pré-requisito: Workout.tsx precisa detectar o nível do programa

Atualmente, `Workout.tsx` busca exercícios hardcoded de `exercicios_treino_usuario`. Para programas avançados, precisa buscar de `exercicios_treino_usuario_avancado`. Também precisa resolver o RER do microciclo (buscar `rer_por_semana` do mesociclo e `ordem_semana` do treino).

---

### 1. Atualizar `Workout.tsx` — detecção de nível e fetch condicional

- Após buscar `treinos_usuario`, buscar `programas_usuario.programa_original_id` → `programas.nivel`
- Se avançado, buscar exercícios de `exercicios_treino_usuario_avancado`
- Buscar `rer_por_semana` do mesociclo correspondente (via `treinos.mesociclo_id` → `mesociclos`)
- Resolver RER de cada exercício: se `rer === 'do_microciclo'`, usar `rer_por_semana[ordem_semana]`
- Renderizar `ExerciseCardAdvanced` em vez de `ExerciseCard` para programas avançados
- Todas as operações de update (`toggleExerciseCompletion`, `updateExerciseWeight`, `completeWorkout`) usam a tabela correta condicionalmente

### 2. Criar `ExerciseCardAdvanced.tsx` (novo componente em `src/components/workout/`)

Componente isolado, sem afetar o `ExerciseCard` existente. Estrutura:

```text
ExerciseCardAdvanced
├── ExerciseHeaderAdvanced (novo)
│   ├── Badge grupo muscular + YouTube
│   ├── Nome do exercício
│   ├── Método especial (destaque, se houver)
│   ├── "S x Rmin-Rmax @X RER" (sempre faixa de reps)
│   ├── Progressão sugerida (Epley) em azul
│   ├── Observação (se existente)
│   ├── Menu de opções (+ "Implementar/Alterar Método Especial")
│   └── Botão Play/Check
├── ExerciseObservation (reutiliza existente)
└── Accordion
    ├── Histórico recente (com notas por série)
    ├── Grid 5 colunas: Série | Carga | Reps | Nota | Concluir
    │   └── Nota: ícone clicável que abre input inline
    ├── "+ Adicionar mais 1 série"
    └── Botão "Concluir exercício"
```

### 3. Criar `ExerciseHeaderAdvanced.tsx` (em `src/components/workout/components/`)

Diferenças do header iniciante:
- Linha de variáveis: `"S x Rmin-Rmax @X RER"` (nunca mostra reps fixo)
- Linha de método especial em destaque abaixo do nome (se houver)
- Progressão sugerida via Epley (placeholder por enquanto, lógica completa no próximo passo)
- Menu com opção extra "Implementar Método Especial" / "Alterar Método Especial"
- Busca `video_url` de `exercicios_avancados` (não `exercicios_iniciantes`)

### 4. Criar `ExerciseSetsAdvanced.tsx` (em `src/components/workout/components/`)

Diferenças do sets iniciante:
- 5 colunas: Série, Carga, Reps, Nota, Concluir
- Coluna Nota: ícone de nota (ex: `StickyNote`) que ao clicar abre um pequeno input/popover para escrever nota daquela série específica
- Notas salvas na coluna `nota` de `series_exercicio_usuario` (já existe)
- Histórico recente: mostra nota por série (não global)
- Remove botão global "Adicionar nota" da área inferior
- Carga e Reps: placeholders/pré-preenchimento conforme progressão sugerida

### 5. Criar hooks avançados

**`useExerciseStateAdvanced.ts`**: Similar ao `useExerciseState`, mas:
- Queries em `exercicios_treino_usuario_avancado`
- Sem `reps_programadas` (não existe na tabela avançada)
- Inicializa sets usando faixa de reps (min da faixa como sugestão)

**`useExerciseActionsAdvanced.ts`**: Similar ao `useExerciseActions`, mas:
- Todas as queries em `exercicios_treino_usuario_avancado`
- Nota por série (salva via `save_series` que já suporta)
- Sem feedback de dificuldade/fadiga do sistema iniciante (será substituído por ARA/ART no próximo passo)

**`usePreviousSeriesAdvanced.ts`**: Similar ao `usePreviousSeries`, mas busca de `exercicios_treino_usuario_avancado` e retorna notas individuais por série.

### 6. Resolver RER do microciclo

Nova utility function `resolveExerciseRer`:
```typescript
function resolveExerciseRer(
  exerciseRer: string, 
  rerPerWeek: Record<string, string>, 
  weekNumber: number
): string {
  if (exerciseRer === 'do_microciclo') {
    return rerPerWeek[weekNumber.toString()] || '';
  }
  return exerciseRer;
}
```

Chamada em `Workout.tsx` ao carregar exercícios avançados, passando o RER resolvido para cada card.

### 7. Progressão Epley (versão simplificada neste passo)

Hook `useEpleyProgression.ts` que:
- Busca a última série concluída do exercício (série 1 do treino anterior)
- Calcula 1RM estimado via Epley: `1RM = peso × (1 + reps/30)`
- Sugere: manter carga e +1 rep OU +incremento e manter reps (método "maior ou igual")
- Retorna mensagem para o header (ex: "Sugestão: 40kg x 9 reps")
- Pré-preenche placeholders de carga/reps na primeira série

### Arquivos criados/alterados

| Arquivo | Tipo |
|---|---|
| `src/components/workout/ExerciseCardAdvanced.tsx` | Novo |
| `src/components/workout/components/ExerciseHeaderAdvanced.tsx` | Novo |
| `src/components/workout/components/ExerciseSetsAdvanced.tsx` | Novo |
| `src/components/workout/hooks/useExerciseStateAdvanced.ts` | Novo |
| `src/components/workout/hooks/useExerciseActionsAdvanced.ts` | Novo |
| `src/components/workout/hooks/usePreviousSeriesAdvanced.ts` | Novo |
| `src/hooks/useEpleyProgression.ts` | Novo |
| `src/utils/rerResolver.ts` | Novo |
| `src/pages/Workout.tsx` | Alterado (detecção nível + fetch condicional + render condicional) |

### Garantia de não-interferência

- Nenhum arquivo existente do sistema iniciante é modificado (exceto `Workout.tsx` que ganha um branch condicional)
- Todos os novos componentes e hooks são arquivos separados
- A lógica de detecção de nível em `Workout.tsx` usa early-branch: se avançado, entra no fluxo avançado; caso contrário, fluxo iniciante permanece 100% inalterado

