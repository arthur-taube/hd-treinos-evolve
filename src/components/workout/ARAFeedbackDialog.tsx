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

interface ARAFeedbackDialogProps {
  isOpen: boolean;
  exerciseName: string;
  onSubmit: (pumpValue: number, fadigaValue: number) => void;
}

const PUMP_OPTIONS = [
  {
    label: "Inexistente",
    value: 0.25,
    description: "Eu não tive nenhum pump com esse exercício.",
  },
  {
    label: "Presente",
    value: 0,
    description: "Eu tive um pump perceptível com esse exercício.",
  },
];

const FADIGA_OPTIONS = [
  {
    label: "Baixa",
    value: 0.75,
    description:
      "Senti pouca ou nenhuma fadiga (fraqueza, exaustão muscular) e perturbação (tremores, descontrole muscular) e certamente poderia fazer mais séries desse exercício.",
  },
  {
    label: "Boa",
    value: 0,
    description:
      "Senti uma boa fadiga (fraqueza, exaustão muscular) e perturbação (tremores, descontrole muscular) e/ou não sei se aguentaria mais uma série.",
  },
  {
    label: "Extrema",
    value: -1,
    description:
      "Minha fadiga (fraqueza, exaustão) e/ou perturbação (tremores, descontrole) muscular foi tanta que prejudicou a(s) última(s) série(s) do exercício.",
  },
];

export function ARAFeedbackDialog({
  isOpen,
  exerciseName,
  onSubmit,
}: ARAFeedbackDialogProps) {
  const [selectedPump, setSelectedPump] = useState<number | null>(null);
  const [selectedFadiga, setSelectedFadiga] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPump(null);
      setSelectedFadiga(null);
    }
  }, [isOpen]);

  const selectedPumpOption = PUMP_OPTIONS.find((o) => o.value === selectedPump);
  const selectedFadigaOption = FADIGA_OPTIONS.find(
    (o) => o.value === selectedFadiga
  );

  const canSubmit = selectedPump !== null && selectedFadiga !== null;

  const handleSubmit = () => {
    if (selectedPump !== null && selectedFadiga !== null) {
      onSubmit(selectedPump, selectedFadiga);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {}}
    >
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        hideCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Avaliação das Respostas Agudas</DialogTitle>
          <DialogDescription>{exerciseName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Pump Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Pump</h4>
            <div className="flex gap-2">
              {PUMP_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  variant={selectedPump === option.value ? "default" : "outline"}
                  size="sm"
                  className={`flex-1 ${
                    selectedPump === option.value
                      ? "bg-primary hover:bg-primary/90"
                      : ""
                  }`}
                  onClick={() => setSelectedPump(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {selectedPumpOption && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
                {selectedPumpOption.description}
              </p>
            )}
          </div>

          {/* Fadiga Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Fadiga</h4>
            <div className="flex gap-2">
              {FADIGA_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  variant={
                    selectedFadiga === option.value ? "default" : "outline"
                  }
                  size="sm"
                  className={`flex-1 ${
                    selectedFadiga === option.value
                      ? "bg-primary hover:bg-primary/90"
                      : ""
                  }`}
                  onClick={() => setSelectedFadiga(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {selectedFadigaOption && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
                {selectedFadigaOption.description}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
