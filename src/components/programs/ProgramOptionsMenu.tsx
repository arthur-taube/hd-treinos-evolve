
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Play, Pause, Flag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProgramOptionsMenuProps {
  isPaused?: boolean;
  isFinished?: boolean;
  hasUnfinishedWorkouts?: boolean;
  onResume?: () => void;
  onPause?: () => void;
  onEdit?: () => void;
  onFinish?: () => void;
  onDelete?: () => void;
}

const ProgramOptionsMenu = ({
  isPaused = false,
  isFinished = false,
  hasUnfinishedWorkouts = true,
  onResume,
  onPause,
  onEdit,
  onFinish,
  onDelete,
}: ProgramOptionsMenuProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  const handleDelete = () => {
    if (onDelete) onDelete();
    toast.success("Programa excluído com sucesso");
    setShowDeleteDialog(false);
  };

  const handleFinish = () => {
    if (onFinish) onFinish();
    toast.success("Programa finalizado com sucesso");
    setShowFinishDialog(false);
  };

  const canResume = isPaused && hasUnfinishedWorkouts;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isFinished ? (
            // Programas finalizados: apenas excluir
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir este treino
            </DropdownMenuItem>
          ) : isPaused ? (
            // Programas pausados: continuar, finalizar, excluir
            <>
              <DropdownMenuItem 
                onClick={onResume}
                disabled={!canResume}
                className={!canResume ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Play className="h-4 w-4 mr-2" />
                Continuar este treino
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFinishDialog(true)}>
                <Flag className="h-4 w-4 mr-2" />
                Finalizar este treino
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir este treino
              </DropdownMenuItem>
            </>
          ) : (
            // Programa ativo: pausar, alterar, finalizar, excluir
            <>
              <DropdownMenuItem onClick={onPause}>
                <Pause className="h-4 w-4 mr-2" />
                Pausar este treino
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Alterar este treino
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFinishDialog(true)}>
                <Flag className="h-4 w-4 mr-2" />
                Finalizar este treino
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir este treino
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir programa permanentemente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Esta ação excluirá permanentemente o programa, incluindo:
              </span>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Todos os treinos (concluídos e pendentes)</li>
                <li>Todo o histórico de séries executadas</li>
                <li>Todas as configurações de exercícios</li>
              </ul>
              <span className="block font-medium text-destructive">
                Esta ação não pode ser desfeita.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar programa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar este programa de treino? Ele será movido para o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinish}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProgramOptionsMenu;
