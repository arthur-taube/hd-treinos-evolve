# Confirmação ao pular séries não concluídas

## Problema
No menu de opções do exercício (dentro do treino), o item "Pular séries não concluídas" executa a ação imediatamente ao ser clicado. Um toque acidental conclui o exercício e impede o registro/feedback das séries restantes, sem possibilidade de desfazer.

## Solução
Adicionar um diálogo de confirmação que intercepta o clique. A ação real (`skipIncompleteSets`) só roda após o usuário confirmar.

Texto do diálogo:
- Título: "Pular séries não concluídas?"
- Descrição: "Deseja pular as séries não completadas e concluir este exercício?"
- Botões: "Cancelar" e "Pular e concluir"

## Onde alterar
A mesma mudança em dois componentes (iniciante e avançado), já que ambos têm o item de menu idêntico:

1. `src/components/workout/components/ExerciseHeader.tsx`
2. `src/components/workout/components/ExerciseHeaderAdvanced.tsx`

## Detalhes técnicos
Em cada arquivo:
- Importar os componentes de `AlertDialog` (`@/components/ui/alert-dialog`).
- Adicionar um estado local `showSkipConfirm` (`useState(false)`).
- Trocar o `onClick={skipIncompleteSets}` do `DropdownMenuItem` por `onClick={() => setShowSkipConfirm(true)}` (usando `onSelect`/`e.preventDefault` se necessário para o menu não fechar antes da abertura do diálogo — confirmar comportamento durante a implementação).
- Renderizar um `<AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>` com o conteúdo acima; o `AlertDialogAction` chama `skipIncompleteSets()` e fecha o diálogo, e o `AlertDialogCancel` apenas fecha.

Nenhuma alteração na lógica de negócio de `skipIncompleteSets` — apenas adiciona a etapa de confirmação na UI.