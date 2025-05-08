
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
import { MoreVertical, Pencil, Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ProgramCatalogOptionsMenuProps {
  programId: string;
  programName: string;
  onEdit?: (programId: string) => void;
  onDuplicate?: (programId: string) => void;
  onDelete?: (programId: string) => void;
}

const ProgramCatalogOptionsMenu = ({
  programId,
  programName,
  onEdit,
  onDuplicate,
  onDelete,
}: ProgramCatalogOptionsMenuProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDelete = async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(programId);
        toast({
          title: "Programa excluído",
          description: `O programa "${programName}" foi removido do catálogo.`
        });
      } catch (error: any) {
        toast({
          title: "Erro ao excluir programa",
          description: error.message || "Não foi possível excluir o programa.",
          variant: "destructive"
        });
      } finally {
        setIsDeleting(false);
        setShowDeleteDialog(false);
      }
    }
  };

  const handleDuplicate = async () => {
    if (onDuplicate) {
      setIsDuplicating(true);
      try {
        await onDuplicate(programId);
        toast({
          title: "Programa duplicado",
          description: `Uma cópia do programa "${programName}" foi criada.`
        });
      } catch (error: any) {
        toast({
          title: "Erro ao duplicar programa",
          description: error.message || "Não foi possível duplicar o programa.",
          variant: "destructive"
        });
      } finally {
        setIsDuplicating(false);
      }
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(programId);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground ml-auto">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar programa
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleDuplicate}
            disabled={isDuplicating}
          >
            <Copy className="h-4 w-4 mr-2" />
            {isDuplicating ? "Duplicando..." : "Duplicar programa"}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir programa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir programa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o programa "{programName}"? Esta ação não pode ser desfeita.
              <br /><br />
              <b>Nota:</b> Os registros históricos dos usuários que já utilizaram este programa serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProgramCatalogOptionsMenu;
