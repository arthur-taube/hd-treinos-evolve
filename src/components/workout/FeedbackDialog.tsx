
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
}: FeedbackDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string | number | null>(null);
  const [showDescription, setShowDescription] = useState<string | null>(null);
  
  useEffect(() => {
    if (!isOpen) {
      setSelectedValue(null);
      setShowDescription(null);
    }
  }, [isOpen]);

  const handleSelect = (option: FeedbackOption) => {
    setSelectedValue(option.value);
    setShowDescription(option.description);
  };

  const handleSubmit = () => {
    if (selectedValue !== null) {
      onSubmit(selectedValue);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description.replace("{exerciseName}", exerciseName).replace("{muscleName}", muscleName || "")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-3">
            {options.map((option) => (
              <Button
                key={option.value}
                variant={selectedValue === option.value ? "default" : "outline"}
                className={`w-full justify-start text-left ${selectedValue === option.value ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          
          {showDescription && (
            <div className="text-sm p-3 bg-blue-50 text-blue-800 rounded-md">
              {showDescription}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={selectedValue === null}
            className="w-full"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
