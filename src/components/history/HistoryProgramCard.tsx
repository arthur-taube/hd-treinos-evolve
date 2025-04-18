
import { Card } from "@/components/ui/card";
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
import { MoreVertical, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface HistoryProgramCardProps {
  name: string;
  completedDate: string;
  onRestart?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
}

const HistoryProgramCard = ({
  name,
  completedDate,
  onRestart,
  onDelete,
  onViewDetails,
}: HistoryProgramCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    if (onDelete) onDelete();
    toast.success("Programa excluído do histórico");
    setShowDeleteDialog(false);
  };

  const handleRestart = () => {
    if (onRestart) onRestart();
    toast.success("Programa reiniciado com sucesso");
  };

  return (
    <>
      <Card 
        className="flex justify-between items-center p-4 program-card cursor-pointer"
        onClick={onViewDetails}
      >
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-muted-foreground">Finalizado em {completedDate}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleRestart();
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reiniciar este treino
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir este treino
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir programa do histórico</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este programa de treino do histórico? Você perderá todo o registro histórico deste programa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default HistoryProgramCard;
