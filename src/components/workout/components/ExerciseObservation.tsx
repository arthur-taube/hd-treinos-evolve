
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exerciseObservationSchema } from "@/lib/validation";
import { toast } from "@/hooks/use-toast";

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

  const handleSave = () => {
    // Validate observation
    const validation = exerciseObservationSchema.safeParse(observation);
    if (!validation.success) {
      toast({
        title: "Observação inválida",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }
    saveObservation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Prevent typing beyond limit
    if (newValue.length <= 1000) {
      setObservation(newValue);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="relative">
        <Input 
          value={observation} 
          onChange={handleChange}
          placeholder="Digite sua observação sobre o exercício" 
          maxLength={1000}
        />
        <span className="absolute right-2 bottom-[-20px] text-xs text-muted-foreground">
          {observation.length}/1000
        </span>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowObservationInput(false)}
        >
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
