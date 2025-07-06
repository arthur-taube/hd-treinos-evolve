
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ExerciseObservationProps {
  observation: string;
  setObservation: (observation: string) => void;
  showObservationInput: boolean;
  setShowObservationInput: (show: boolean) => void;
  saveObservation: () => void;
}

export function ExerciseObservation({
  observation,
  setObservation,
  showObservationInput,
  setShowObservationInput,
  saveObservation
}: ExerciseObservationProps) {
  if (!showObservationInput) return null;

  return (
    <div className="mt-4 space-y-2">
      <Input 
        value={observation} 
        onChange={(e) => setObservation(e.target.value)} 
        placeholder="Digite sua observação sobre o exercício" 
      />
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowObservationInput(false)}
        >
          Cancelar
        </Button>
        <Button size="sm" onClick={saveObservation}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
