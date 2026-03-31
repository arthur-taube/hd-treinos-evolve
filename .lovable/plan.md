## Plano: Suporte avançado no ProgramUserEdit

O problema é duplo: (1) a página sempre renderiza `ExerciseKanban` (iniciante), e (2) o `updateUserProgram` sempre grava em `exercicios_treino_usuario`. Para programas avançados, precisa usar `ExerciseKanbanAdvanced` e gravar em `exercicios_treino_usuario_avancado`.

### 1. `ProgramUserEdit.tsx` — Renderizar kanban condicional

- Importar `ExerciseKanbanAdvanced`
- Verificar `programData.programLevel !== 'iniciante'` para decidir qual kanban renderizar
- Para o avançado: usar `customizerMode={true}`, `maxSets={5}`, mesma lógica de props do `ProgramCustomize.tsx`

### 2. `programCustomizer.ts` — `updateUserProgram` com suporte avançado

Adicionar parâmetro `programLevel` ao `UpdateUserProgramParams`. Quando `nivel !== 'iniciante'`:

- Buscar exercícios existentes de `exercicios_treino_usuario_avancado` em vez de `exercicios_treino_usuario`
- Deletar/ocultar exercícios na tabela avançada
- Atualizar exercícios existentes com campos avançados (`metodo_especial` apenas, de forma idêntica ao customizador avançado)
- Inserir novos exercícios na tabela avançada

### 3. `ProgramUserEdit.tsx` — Passar `programLevel` no save

Incluir `programLevel: programData.programLevel` na chamada a `updateUserProgram`.

### Arquivos


| Arquivo                          | Alteração                                        |
| -------------------------------- | ------------------------------------------------ |
| `src/pages/ProgramUserEdit.tsx`  | Kanban condicional + passar programLevel no save |
| `src/utils/programCustomizer.ts` | `updateUserProgram` com branch avançado          |
