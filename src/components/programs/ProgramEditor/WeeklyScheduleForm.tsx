
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface WeeklyScheduleFormProps {
  weeklyFrequency: number;
  onSaveSchedule: (schedule: string[]) => void;
  initialSchedule?: string[];
}

const daysOfWeek = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

export default function WeeklyScheduleForm({ weeklyFrequency, onSaveSchedule, initialSchedule }: WeeklyScheduleFormProps) {
  const [schedule, setSchedule] = useState<string[]>(
    initialSchedule || Array(weeklyFrequency).fill("")
  );

  // Atualizar o cronograma quando initialSchedule muda
  useEffect(() => {
    if (initialSchedule && initialSchedule.length > 0) {
      setSchedule(initialSchedule);
      // Se há um cronograma inicial, salvá-lo automaticamente
      onSaveSchedule(initialSchedule);
    }
  }, [initialSchedule, onSaveSchedule]);

  const handleDayChange = (index: number, day: string) => {
    const newSchedule = [...schedule];
    newSchedule[index] = day;
    setSchedule(newSchedule);
  };

  const handleSave = () => {
    if (schedule.some(day => !day)) {
      toast({
        title: "Cronograma incompleto",
        description: "Por favor, selecione todos os dias da semana.",
        variant: "destructive"
      });
      return;
    }

    // Verificar se há dias duplicados
    const uniqueDays = new Set(schedule);
    if (uniqueDays.size !== schedule.length) {
      toast({
        title: "Dias duplicados",
        description: "Cada dia só pode ser selecionado uma vez.",
        variant: "destructive"
      });
      return;
    }

    onSaveSchedule(schedule);
    toast({
      title: "Cronograma salvo",
      description: "O cronograma semanal foi salvo com sucesso!",
    });
  };

  const isScheduleComplete = schedule.every(day => day) && new Set(schedule).size === schedule.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cronograma Semanal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {Array.from({ length: weeklyFrequency }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Label className="min-w-[80px]">Dia {index + 1}:</Label>
              <Select
                value={schedule[index] || ""}
                onValueChange={(value) => handleDayChange(index, value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem 
                      key={day.value} 
                      value={day.value}
                      disabled={schedule.includes(day.value) && schedule[index] !== day.value}
                    >
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={!isScheduleComplete}
          className="w-full"
        >
          {initialSchedule ? "Atualizar Cronograma" : "Salvar Cronograma"}
        </Button>
      </CardContent>
    </Card>
  );
}
