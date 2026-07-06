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

export interface StarARAResult {
  fadigaValue: number;
  performance: "melhor" | "pior";
  recuperacao: number | null;
}

interface ARAStarFeedbackDialogProps {
  isOpen: boolean;
  exerciseName: string;
  muscleGroup?: string;
  onSubmit: (result: StarARAResult) => void;
}

const FADIGA_OPTIONS = [
  {
    label: "Baixa",
    value: 0.75,
    description:
      "Senti pouca ou nenhuma fadiga (fraqueza/exaustão muscular) e perturbação (tremores/descontrole muscular) após completar esse exercício.",
  },
  {
    label: "Razoável/Boa",
    value: 0.25,
    description:
      "Senti alguma fadiga (fraqueza/exaustão muscular) e/ou perturbação (tremores/descontrole muscular) após completar esse exercício.",
  },
  {
    label: "Extrema",
    value: -0.75,
    description:
      "Minha fadiga (fraqueza/exaustão) e/ou perturbação (tremores/descontrole) muscular foi tanta que chegou a prejudicar a(s) última(s) série(s) do exercício.",
  },
];

const PERFORMANCE_OPTIONS: {
  label: string;
  value: "pior" | "melhor";
  variantClass: string;
  description: string;
}[] = [
  {
    label: "Pior, regredi",
    value: "pior",
    variantClass:
      "bg-red-500/15 text-red-600 border-red-500/40 hover:bg-red-500/25 data-[selected=true]:bg-red-500 data-[selected=true]:text-white",
    description:
      "Não consegui atingir as mesmas repetições da semana passada ou não consegui seguir a progressão sugerida.",
  },
  {
    label: "Maior ou Igual",
    value: "melhor",
    variantClass:
      "bg-green-500/15 text-green-600 border-green-500/40 hover:bg-green-500/25 data-[selected=true]:bg-green-600 data-[selected=true]:text-white",
    description:
      "Consegui atingir a progressão sugerida ou manter/aumentar minhas repetições em relação à semana passada (especialmente na primeira série).",
  },
];

const RECUPERACAO_OPTIONS = [
  {
    label: "Aumento de séries anteriores",
    value: 0,
    description:
      "Houve aumento de séries em exercício anterior para esse mesmo músculo hoje e cheguei no exercício mais fatigado do que no treino passado.",
  },
  {
    label: "Estou em um dia ruim",
    value: 1,
    description:
      "Não estou bem hoje. Dormi e/ou me alimentei mal / Tive um dia estressante / Estou mentalmente cansado.",
  },
  {
    label: "Estou sempre exausto",
    value: 2,
    description:
      "Venho sentindo estes músculos exaustos e/ou com dores na(s) última(s) semana(s) e tenho notado que meu desempenho vem regredindo.",
  },
];

export function ARAStarFeedbackDialog({
  isOpen,
  exerciseName,
  muscleGroup,
  onSubmit,
}: ARAStarFeedbackDialogProps) {
  const [selectedFadiga, setSelectedFadiga] = useState<number | null>(null);
  const [selectedPerformance, setSelectedPerformance] = useState<"melhor" | "pior" | null>(null);
  const [selectedRecuperacao, setSelectedRecuperacao] = useState<number | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFadiga(null);
      setSelectedPerformance(null);
      setSelectedRecuperacao(null);
      setShowRecovery(false);
    }
  }, [isOpen]);

  const selectedFadigaOption = FADIGA_OPTIONS.find((o) => o.value === selectedFadiga);
  const selectedPerformanceOption = PERFORMANCE_OPTIONS.find((o) => o.value === selectedPerformance);
  const selectedRecuperacaoOption = RECUPERACAO_OPTIONS.find((o) => o.value === selectedRecuperacao);

  const canSubmitMain = selectedFadiga !== null && selectedPerformance !== null;

  const handleMainSave = () => {
    if (selectedFadiga === null || selectedPerformance === null) return;
    if (selectedPerformance === "pior") {
      setShowRecovery(true);
      return;
    }
    onSubmit({ fadigaValue: selectedFadiga, performance: "melhor", recuperacao: null });
  };

  const handleRecoverySave = () => {
    if (selectedFadiga === null || selectedRecuperacao === null) return;
    onSubmit({ fadigaValue: selectedFadiga, performance: "pior", recuperacao: selectedRecuperacao });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        hideCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {!showRecovery ? (
          <>
            <DialogHeader>
              <DialogTitle>Avaliação das Respostas Agudas</DialogTitle>
              <DialogDescription>{exerciseName}</DialogDescription>
              {muscleGroup && (
                <p className="text-sm text-muted-foreground pt-1">
                  Como você sentiu o(s) músculo(s){" "}
                  <span className="font-medium text-foreground">{muscleGroup}</span> após o exercício{" "}
                  <span className="font-medium text-foreground">{exerciseName}</span>?
                </p>
              )}
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Fadiga */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Avalie sua fadiga</h4>
                <div className="flex gap-2">
                  {FADIGA_OPTIONS.map((option) => (
                    <Button
                      key={option.label}
                      variant={selectedFadiga === option.value ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
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

              {/* Performance */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Como foi sua performance</h4>
                <div className="flex gap-2">
                  {PERFORMANCE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant="outline"
                      size="sm"
                      data-selected={selectedPerformance === option.value}
                      className={`flex-1 ${option.variantClass}`}
                      onClick={() => setSelectedPerformance(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                {selectedPerformanceOption && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
                    {selectedPerformanceOption.description}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleMainSave} disabled={!canSubmitMain} className="w-full">
                Salvar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Recuperação</DialogTitle>
              <DialogDescription>Entendendo por que você regrediu</DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <div className="flex flex-col gap-2">
                {RECUPERACAO_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedRecuperacao === option.value ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedRecuperacao(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {selectedRecuperacaoOption && (
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
                  {selectedRecuperacaoOption.description}
                </p>
              )}
            </div>

            <DialogFooter className="flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRecovery(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRecoverySave}
                disabled={selectedRecuperacao === null}
                className="flex-1"
              >
                Salvar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
