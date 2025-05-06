
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export type FeedbackOption = {
  value: string | number;
  label: string;
  description: string;
  color?: string;
};

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string | number) => void;
  title: string;
  description: string;
  options: FeedbackOption[];
  exerciseName: string;
  muscleName?: string;
  isNumericInput?: boolean;
  minValue?: number;
  maxValue?: number;
  step?: number;
}

export function FeedbackDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  options,
  exerciseName,
  muscleName,
  isNumericInput = false,
  minValue = 0.5,
  maxValue = 10,
  step = 0.5
}: FeedbackDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string | number | null>(null);
  const [showDescription, setShowDescription] = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState<number>(minValue);
  const [inputValue, setInputValue] = useState<string>('');
  
  useEffect(() => {
    if (!isOpen) {
      setSelectedValue(null);
      setShowDescription(null);
      setNumericValue(minValue);
      setInputValue('');
    }
  }, [isOpen, minValue]);

  const handleSelect = (option: FeedbackOption) => {
    setSelectedValue(option.value);
    setShowDescription(option.description);
  };

  const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accept both comma and period as decimal separators
    const value = e.target.value.replace(',', '.');
    setInputValue(e.target.value);
    
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue)) {
      // Ensure value is within range and rounded to nearest step
      const roundedValue = Math.round(parsedValue / step) * step;
      const boundedValue = Math.max(minValue, Math.min(maxValue, roundedValue));
      setNumericValue(boundedValue);
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newValue = value[0];
    setNumericValue(newValue);
    setInputValue(newValue.toString().replace('.', ','));
  };

  const handleSubmit = () => {
    if (isNumericInput) {
      onSubmit(numericValue);
    } else if (selectedValue !== null) {
      onSubmit(selectedValue);
    }
  };

  // Função para formatar o texto da descrição substituindo os placeholders
  const formatDescription = () => {
    let formattedDesc = description;
    
    if (exerciseName) {
      formattedDesc = formattedDesc.replace("{exerciseName}", exerciseName);
    }
    
    if (muscleName) {
      formattedDesc = formattedDesc.replace("{muscleName}", muscleName);
    }
    
    return formattedDesc;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {formatDescription()}
            
            {isNumericInput && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center ml-1 cursor-help">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Isso quer dizer o mínimo de carga que você consegue aumentar no exercício. 
                      Ex.: se o mínimo de peso que você consegue aumentar na barra é 1kg de cada lado, 
                      a carga incremental mínima é 2kg; já se somente é possível aumentar um tijolinho de 5kg 
                      por vez em um aparelho, o incremento mínimo é 5kg.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {isNumericInput ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span>Digite:</span>
                <Input
                  type="text"
                  value={inputValue}
                  onChange={handleNumericInputChange}
                  placeholder="0,0"
                  className="w-24"
                />
                <span>kg</span>
              </div>
              <div className="px-1 py-2">
                <Slider 
                  value={[numericValue]} 
                  min={minValue} 
                  max={maxValue} 
                  step={step}
                  onValueChange={handleSliderChange}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{minValue.toString().replace('.', ',')} kg</span>
                  <span>{maxValue.toString().replace('.', ',')} kg</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {options.map((option) => (
                <Button
                  key={option.value.toString()}
                  variant={selectedValue === option.value ? "default" : "outline"}
                  className={`w-full justify-start text-left ${selectedValue === option.value ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
          
          {showDescription && !isNumericInput && (
            <div className="text-sm p-3 bg-blue-50 text-blue-800 rounded-md">
              {showDescription}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isNumericInput ? false : selectedValue === null}
            className="w-full"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
