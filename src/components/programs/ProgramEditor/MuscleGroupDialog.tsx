
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MuscleGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (groups: string[], isMultiple: boolean) => void;
}

const muscleGroups = [
  "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", 
  "Quadríceps", "Posteriores", "Panturrilhas", "Abdômen", "Trapézio"
];

const MuscleGroupDialog = ({ open, onClose, onSelect }: MuscleGroupDialogProps) => {
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [singleGroup, setSingleGroup] = useState<string>("");

  const handleSubmit = () => {
    if (allowMultiple) {
      onSelect(selectedGroups, true);
    } else {
      onSelect([singleGroup], false);
    }
    onClose();
  };

  const handleCheckboxChange = () => {
    setAllowMultiple(!allowMultiple);
    setSelectedGroups([]);
    setSingleGroup("");
  };

  const toggleMuscleGroup = (group: string) => {
    setSelectedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Grupo Muscular</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="multiple"
              checked={allowMultiple}
              onCheckedChange={handleCheckboxChange}
            />
            <label
              htmlFor="multiple"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Permitir múltiplos grupos
            </label>
          </div>

          {allowMultiple ? (
            <div className="space-y-2">
              {muscleGroups.map((group) => (
                <div key={group} className="flex items-center space-x-2">
                  <Checkbox
                    id={group}
                    checked={selectedGroups.includes(group)}
                    onCheckedChange={() => toggleMuscleGroup(group)}
                  />
                  <label
                    htmlFor={group}
                    className="text-sm font-medium leading-none"
                  >
                    {group}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <Select value={singleGroup} onValueChange={setSingleGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo muscular" />
              </SelectTrigger>
              <SelectContent>
                {muscleGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={allowMultiple ? selectedGroups.length === 0 : !singleGroup}
          >
            Selecionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MuscleGroupDialog;
