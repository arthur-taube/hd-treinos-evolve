import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allMuscles: string[];
  selected: string[];
  onSave: (groups: string[]) => Promise<void>;
}

const VolumeGroupsDialog = ({ open, onOpenChange, allMuscles, selected, onSave }: Props) => {
  const [local, setLocal] = useState<string[]>(selected);

  const toggle = (m: string) => {
    setLocal(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));
  };

  const handleSave = async () => {
    await onSave(local);
    toast.success("Grupos padrão salvos");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (o) setLocal(selected); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Grupos musculares exibidos</DialogTitle>
          <DialogDescription>
            Selecione os grupos que quer ver por padrão no gráfico de volume.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 pr-3">
          <div className="space-y-2">
            {allMuscles.map(m => (
              <label
                key={m}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 cursor-pointer"
              >
                <Checkbox checked={local.includes(m)} onCheckedChange={() => toggle(m)} />
                <span className="text-sm">{m}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar como padrão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VolumeGroupsDialog;
