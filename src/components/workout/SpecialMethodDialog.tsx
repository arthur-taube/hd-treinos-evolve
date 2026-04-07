import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SpecialMethod {
  id: string;
  nome: string;
  descricao: string;
}

interface SpecialMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  currentMethod: string | null;
  onSaved: () => void;
}

const NONE_VALUE = "__none__";

export function SpecialMethodDialog({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  currentMethod,
  onSaved,
}: SpecialMethodDialogProps) {
  const [methods, setMethods] = useState<SpecialMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>(NONE_VALUE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMethod(currentMethod || NONE_VALUE);

    const fetchMethods = async () => {
      const { data, error } = await supabase
        .from("metodos_especiais")
        .select("id, nome, descricao")
        .order("nome");

      if (!error && data) {
        setMethods(data);
      }
    };
    fetchMethods();
  }, [isOpen, currentMethod]);

  const selectedMethodData = methods.find((m) => m.nome === selectedMethod);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const methodValue = selectedMethod === NONE_VALUE ? null : selectedMethod;

      const { error } = await supabase.rpc("update_special_method_advanced", {
        p_exercise_id: exerciseId,
        p_method_name: methodValue,
      });

      if (error) throw error;

      toast({
        title: "Método especial atualizado",
        description: methodValue
          ? `${methodValue} aplicado a ${exerciseName} e treinos futuros.`
          : `Método especial removido de ${exerciseName} e treinos futuros.`,
      });

      onSaved();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar método especial",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Método Especial</DialogTitle>
          <DialogDescription>
            Selecione um método especial para o exercício{" "}
            <span className="font-medium">{exerciseName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Select value={selectedMethod} onValueChange={setSelectedMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Nenhum</SelectItem>
              {methods.map((method) => (
                <SelectItem key={method.id} value={method.nome}>
                  {method.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedMethodData && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {selectedMethodData.descricao}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
