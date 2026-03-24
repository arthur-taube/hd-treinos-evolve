import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PendingARTExercise } from "@/hooks/useARTCheck";
import { toast } from "@/hooks/use-toast";

interface ARTFeedbackDialogProps {
  isOpen: boolean;
  pendingExercises: PendingARTExercise[];
  onSubmit: (evaluations: Record<string, number>) => Promise<void>;
}

const ART_OPTIONS = [
  {
    labelLine1: "Ainda Dolorido",
    labelLine2: "Não recuperado",
    value: -0.5,
    description:
      "Tive (ou ainda tenho) muita dor muscular e/ou minha performance caiu.",
  },
  {
    labelLine1: "Alguma dor",
    labelLine2: "100% recuperado",
    value: 0,
    description:
      "Tive alguma dor muscular e me recuperei a tempo do treino de hoje.",
  },
  {
    labelLine1: "Nenhuma dor",
    labelLine2: "200% recuperado",
    value: 0.5,
    description:
      "Pouca ou nenhuma dor e me recuperei muito antes do treino de hoje.",
  },
];

export function ARTFeedbackDialog({
  isOpen,
  pendingExercises,
  onSubmit,
}: ARTFeedbackDialogProps) {
  const [evaluations, setEvaluations] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const allEvaluated = pendingExercises.every(
    (ex) => evaluations[ex.id] !== undefined
  );

  const handleSelect = (exerciseId: string, value: number) => {
    setEvaluations((prev) => ({ ...prev, [exerciseId]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(evaluations);
      toast({
        title: "Avaliação ART salva",
        description: "Feedback de dor/recuperação registrado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar ART",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedOption = (exerciseId: string) =>
    ART_OPTIONS.find((o) => o.value === evaluations[exerciseId]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        hideCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Avaliação das Respostas Tardias</DialogTitle>
          <DialogDescription>
            Avalie sua dor muscular e recuperação após os exercícios do treino
            anterior:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {pendingExercises.map((exercise) => (
            <div key={exercise.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {exercise.grupo_muscular}
                </Badge>
                <span className="text-sm font-semibold text-foreground">
                  {exercise.nome}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {ART_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={
                      evaluations[exercise.id] === option.value
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className={`w-full justify-center text-center text-[10px] leading-tight h-auto py-2 px-1.5 flex flex-col gap-0.5 ${
                      evaluations[exercise.id] === option.value
                        ? "bg-primary hover:bg-primary/90"
                        : ""
                    }`}
                    onClick={() => handleSelect(exercise.id, option.value)}
                  >
                    <span>{option.labelLine1}</span>
                    <span>{option.labelLine2}</span>
                  </Button>
                ))}
              </div>

              {selectedOption(exercise.id) && (
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
                  {selectedOption(exercise.id)!.description}
                </p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!allEvaluated || saving}
            className="w-full"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
