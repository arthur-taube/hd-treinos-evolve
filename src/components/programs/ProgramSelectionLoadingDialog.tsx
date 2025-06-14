
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProgramSelectionLoadingDialogProps {
  open: boolean;
  programName: string;
}

const ProgramSelectionLoadingDialog = ({ 
  open, 
  programName 
}: ProgramSelectionLoadingDialogProps) => {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Configurando programa
          </DialogTitle>
          <DialogDescription>
            Estamos preparando o programa "{programName}" para você...
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Copiando estrutura do programa
            </span>
          </div>
          
          <Progress value={undefined} className="w-full" />
          
          <div className="text-xs text-muted-foreground text-center">
            Isso pode levar alguns segundos...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProgramSelectionLoadingDialog;
