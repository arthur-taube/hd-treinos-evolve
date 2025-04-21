
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface MuscleGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (groups: string[], isMultiple: boolean) => void;
}

const MuscleGroupDialog = ({ open, onClose, onSelect }: MuscleGroupDialogProps) => {
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [singleGroup, setSingleGroup] = useState<string>("");
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMuscleGroups = async () => {
      if (!open) return;
      
      setIsLoading(true);
      console.log("Fetching muscle groups...");
      
      try {
        const { data, error } = await supabase
          .from('exercicios_iniciantes')
          .select('grupo_muscular');

        if (error) {
          console.error('Error fetching muscle groups:', error);
          return;
        }

        if (data && data.length > 0) {
          // Extract unique muscle groups
          const uniqueGroups = Array.from(new Set(data.map(item => item.grupo_muscular)));
          console.log('Fetched muscle groups:', uniqueGroups);
          setMuscleGroups(uniqueGroups);
        } else {
          console.log('No muscle groups found');
          setMuscleGroups([]);
        }
      } catch (error) {
        console.error('Exception while fetching muscle groups:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMuscleGroups();
  }, [open]);

  const handleSubmit = () => {
    if (allowMultiple) {
      onSelect(selectedGroups, true);
    } else {
      onSelect([singleGroup], false);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedGroups([]);
    setSingleGroup("");
    setAllowMultiple(false);
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Grupo Muscular</DialogTitle>
          <DialogDescription>
            Escolha um grupo muscular para o exercício
          </DialogDescription>
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
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando grupos musculares...</p>
                ) : muscleGroups.length > 0 ? (
                  muscleGroups.map((group) => (
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
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum grupo muscular encontrado</p>
                )}
              </div>
            </ScrollArea>
          ) : (
            <Select value={singleGroup} onValueChange={setSingleGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo muscular" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[200px]">
                  {isLoading ? (
                    <SelectItem disabled value="loading">Carregando...</SelectItem>
                  ) : muscleGroups.length > 0 ? (
                    muscleGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem disabled value="empty">Nenhum grupo encontrado</SelectItem>
                  )}
                </ScrollArea>
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose}>
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
