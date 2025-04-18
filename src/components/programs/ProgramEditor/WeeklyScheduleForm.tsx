
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface WeeklyScheduleProps {
  weeklyFrequency: number;
}

type DayOfWeek = {
  id: string;
  name: string;
  label: string;
};

const daysOfWeek: DayOfWeek[] = [
  { id: "segunda", name: "segunda", label: "Segunda" },
  { id: "terca", name: "terca", label: "Terça" },
  { id: "quarta", name: "quarta", label: "Quarta" },
  { id: "quinta", name: "quinta", label: "Quinta" },
  { id: "sexta", name: "sexta", label: "Sexta" },
  { id: "sabado", name: "sabado", label: "Sábado" },
  { id: "domingo", name: "domingo", label: "Domingo" },
];

export default function WeeklyScheduleForm({ weeklyFrequency }: WeeklyScheduleProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<string[][]>([]);

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      if (selectedDays.length < weeklyFrequency) {
        setSelectedDays([...selectedDays, day]);
      }
    }
  };

  const handleSaveSchedule = () => {
    if (selectedDays.length === weeklyFrequency) {
      setSavedSchedules([...savedSchedules, [...selectedDays]]);
      setSelectedDays([]);
    }
  };

  const handleRemoveSchedule = (index: number) => {
    setSavedSchedules(savedSchedules.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Cronograma de Treino</h3>
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Selecione {weeklyFrequency} dias para criar um cronograma recomendado
        </p>
        
        <div className="flex flex-wrap gap-4 mb-4">
          {daysOfWeek.map((day) => (
            <div 
              key={day.id} 
              className="flex items-center space-x-2"
            >
              <Checkbox 
                id={day.id} 
                checked={selectedDays.includes(day.id)} 
                onCheckedChange={() => handleDayToggle(day.id)}
                disabled={selectedDays.length >= weeklyFrequency && !selectedDays.includes(day.id)}
              />
              <label 
                htmlFor={day.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {day.label}
              </label>
            </div>
          ))}
        </div>
        
        <Button 
          onClick={handleSaveSchedule} 
          variant="outline" 
          size="sm" 
          disabled={selectedDays.length !== weeklyFrequency}
        >
          Definir
        </Button>
      </div>

      {savedSchedules.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Cronogramas salvos</h4>
          <div className="flex flex-col gap-2">
            {savedSchedules.map((schedule, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1 flex-1">
                  {schedule.map((day) => (
                    <Badge key={day} variant="outline">
                      {daysOfWeek.find((d) => d.id === day)?.label || day}
                    </Badge>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => handleRemoveSchedule(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
