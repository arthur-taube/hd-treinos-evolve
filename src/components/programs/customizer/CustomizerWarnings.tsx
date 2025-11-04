import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomizerWarningsProps {
  // Day reorder warning
  showDayOrderWarning: boolean;
  onDayOrderConfirm: () => void;

  // Move exercise warning
  showMoveExerciseWarning: boolean;
  onMoveExerciseConfirm: () => void;
  onMoveExerciseCancel: () => void;

  // Cancel confirmation
  showCancelConfirmation: boolean;
  onCancelConfirm: () => void;
  onCancelCancel: () => void;

  // Navigation blocker
  showNavigationWarning: boolean;
  onNavigationProceed: () => void;
  onNavigationCancel: () => void;
}

export function CustomizerWarnings({
  showDayOrderWarning,
  onDayOrderConfirm,
  showMoveExerciseWarning,
  onMoveExerciseConfirm,
  onMoveExerciseCancel,
  showCancelConfirmation,
  onCancelConfirm,
  onCancelCancel,
  showNavigationWarning,
  onNavigationProceed,
  onNavigationCancel,
}: CustomizerWarningsProps) {
  return (
    <>
      {/* Aviso de alteração da ordem dos dias */}
      <AlertDialog open={showDayOrderWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção ao Alterar Ordem dos Dias</AlertDialogTitle>
            <AlertDialogDescription>
              A alteração da ordem dos dias pode afetar a efetividade dos treinos.
              Certifique-se de ajustar os dias de treino/descanso corretamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={onDayOrderConfirm}>
              OK, Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aviso de mover exercício entre dias */}
      <AlertDialog open={showMoveExerciseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover Exercício?</AlertDialogTitle>
            <AlertDialogDescription>
              A alteração do dia de um exercício pode afetar a efetividade dos
              treinos. Tem certeza que quer mover esse exercício?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onMoveExerciseCancel}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={onMoveExerciseConfirm}>
              OK, Mover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de cancelamento */}
      <AlertDialog open={showCancelConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Customização?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as alterações serão perdidas e o programa não será adicionado à
              sua conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelCancel}>
              Continuar Editando
            </AlertDialogCancel>
            <AlertDialogAction onClick={onCancelConfirm}>
              Sim, Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aviso de navegação */}
      <AlertDialog open={showNavigationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar Alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Se sair agora, todas as customizações
              serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onNavigationCancel}>
              Continuar Editando
            </AlertDialogCancel>
            <AlertDialogAction onClick={onNavigationProceed}>
              Sair sem Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
