## Correções de UI: Dashboard e ActiveProgram

### Alterações

#### 1. `src/hooks/useDashboardData.ts`

- Adicionar `nome_personalizado` ao select de `programas_usuario`
- Incluir `nome_personalizado` na interface `ActiveProgram` e no state
- Calcular progresso real (completados/total) em vez de usar `programas_usuario.progresso` (que parece estar zerado)
- Remover fetch de `lastWorkout` (seção será removida)

#### 2. `src/pages/Dashboard.tsx`

- **Card Meus Programas**: mostrar `nome_personalizado` como título principal, e `Programa base: programaOriginal.nome` como subtítulo em cinza. Progresso real calculado.
- **Card Próximo Treino**: usar `nome_personalizado` em vez do nome genérico
- **Remover** seção Histórico inteira

#### 3. `src/pages/ActiveProgram.tsx` (linhas 365-398)

- Trocar `programaOriginal.nome` pelo `nome_personalizado` do `programas_usuario` (precisa adicionar ao select/interface)
- Substituir descrição por `Programa base: programaOriginal.nome`
- Adicionar tooltip na descrição com `programaOriginal.descricao`

### Detalhes técnicos

**useDashboardData**: o select muda para incluir `nome_personalizado` e calcular progresso via contagem de treinos:

```typescript
.select('id, progresso, data_inicio, nome_personalizado, programas!inner(nome)')
```

Depois buscar treinos para calcular progresso real (completados/total).

**ActiveProgram**: adicionar `nome_personalizado` à interface `ProgramaUsuario` e ao select (`programas_usuario` já retorna `*`, então já vem). Usar no header:

- Título: `programaUsuario.nome_personalizado || programaOriginal.nome`
- Subtítulo: `Programa base: programaOriginal.nome` (com tooltip da descrição)