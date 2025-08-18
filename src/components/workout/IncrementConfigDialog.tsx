
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface IncrementConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: number) => void;
  exerciseName: string;
  muscleName?: string;
}

const INCREMENT_VALUES = [0.5, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 10];

export function IncrementConfigDialog({
  isOpen,
  onClose,
  onSubmit,
  exerciseName,
  muscleName
}: IncrementConfigDialogProps) {
  const [sliderValue, setSliderValue] = useState([4]); // Index 4 = 2.5kg (default)
  const [inputValue, setInputValue] = useState("2.5");
  const [useCustomValue, setUseCustomValue] = useState(false);

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    setInputValue(INCREMENT_VALUES[value[0]].toString());
    setUseCustomValue(false);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setUseCustomValue(true);
  };

  const handleSubmit = () => {
    const finalValue = useCustomValue ? parseFloat(inputValue) : INCREMENT_VALUES[sliderValue[0]];
    
    if (isNaN(finalValue) || finalValue <= 0) {
      return;
    }
    
    onSubmit(finalValue);
  };

  const currentSliderValue = INCREMENT_VALUES[sliderValue[0]];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuração do exercício</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Qual é a carga incremental mínima para o exercício{" "}
            <span className="font-medium">{exerciseName}</span>
            {muscleName && ` (${muscleName})`}?
          </p>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Controle deslizante (recomendado)</Label>
              <div className="px-3">
                <Slider
                  value={sliderValue}
                  onValueChange={handleSliderChange}
                  max={INCREMENT_VALUES.length - 1}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0.5kg</span>
                  <span className="font-medium">{currentSliderValue}kg</span>
                  <span>10kg</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-increment">Digite um valor personalizado</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="custom-increment"
                  type="number"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  step="0.25"
                  min="0.25"
                  max="50"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">kg</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
