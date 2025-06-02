
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WeeklyScheduleFormProps {
  weeklyFrequency: number;
  onSaveSchedules: (schedules: string[][]) => void;
  initialSchedules?: string[][];
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

export default function WeeklyScheduleForm({ 
  weeklyFrequency, 
  onSaveSchedules, 
  initialSchedules = [] 
}: WeeklyScheduleFormProps) {
  const [scheduleOptions, setScheduleOptions] = useState<string[][]>(initialSchedules);
  const [newSchedule, setNewSchedule] = useState<string[]>(Array(weeklyFrequency).fill(""));
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedDefault, setSelectedDefault] = useState<number>(0);

  // Atualizar quando initialSchedules muda
  useEffect(() => {
    if (initialSchedules.length > 0) {
      setScheduleOptions(initialSchedules);
      // Se há cronogramas iniciais, salvar automaticamente
      onSaveSchedules(initialSchedules);
    }
  }, [initialSchedules, onSaveSchedules]);

  const generateScheduleName = (schedule: string[]) => {
    const dayNames = schedule.map(day => {
      const dayObj = daysOfWeek.find(d => d.value === day);
      return dayObj ? dayObj.label.substring(0, 3) : day;
    });
    return dayNames.join("/");
  };

  const handleDayChange = (index: number, day: string) => {
    const updated = [...newSchedule];
    updated[index] = day;
    setNewSchedule(updated);
  };

  const handleAddSchedule = () => {
    if (newSchedule.some(day => !day)) {
      toast({
        title: "Cronograma incompleto",
        description: "Por favor, selecione todos os dias da semana.",
        variant: "destructive"
      });
      return;
    }

    // Verificar se há dias duplicados
    const uniqueDays = new Set(newSchedule);
    if (uniqueDays.size !== newSchedule.length) {
      toast({
        title: "Dias duplicados",
        description: "Cada dia só pode ser selecionado uma vez.",
        variant: "destructive"
      });
      return;
    }

    // Verificar se já existe um cronograma igual
    const scheduleExists = scheduleOptions.some(option => 
      option.length === newSchedule.length && 
      option.every((day, index) => day === newSchedule[index])
    );

    if (scheduleExists) {
      toast({
        title: "Cronograma duplicado",
        description: "Este cronograma já foi adicionado.",
        variant: "destructive"
      });
      return;
    }

    const updatedOptions = [...scheduleOptions, newSchedule];
    setScheduleOptions(updatedOptions);
    setNewSchedule(Array(weeklyFrequency).fill(""));
    setIsAddingNew(false);
    
    toast({
      title: "Cronograma adicionado",
      description: `Opção "${generateScheduleName(newSchedule)}" foi adicionada.`,
    });
  };

  const handleRemoveSchedule = (index: number) => {
    if (scheduleOptions.length <= 1) {
      toast({
        title: "Não é possível remover",
        description: "Deve haver pelo menos uma opção de cronograma.",
        variant: "destructive"
      });
      return;
    }

    const updatedOptions = scheduleOptions.filter((_, i) => i !== index);
    setScheduleOptions(updatedOptions);
    
    // Ajustar seleção padrão se necessário
    if (selectedDefault >= updatedOptions.length) {
      setSelectedDefault(0);
    }

    toast({
      title: "Cronograma removido",
      description: "A opção foi removida com sucesso.",
    });
  };

  const handleSave = () => {
    if (scheduleOptions.length === 0) {
      toast({
        title: "Nenhum cronograma",
        description: "Adicione pelo menos uma opção de cronograma.",
        variant: "destructive"
      });
      return;
    }

    onSaveSchedules(scheduleOptions);
    toast({
      title: "Cronogramas salvos",
      description: `${scheduleOptions.length} opção(ões) de cronograma foram salvas!`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cronogramas Semanais Recomendados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Opções existentes */}
        {scheduleOptions.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Opções configuradas:</Label>
            <RadioGroup 
              value={selectedDefault.toString()} 
              onValueChange={(value) => setSelectedDefault(Number(value))}
              className="space-y-2"
            >
              {scheduleOptions.map((schedule, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={index.toString()} id={`schedule-${index}`} />
                    <Label htmlFor={`schedule-${index}`} className="font-medium">
                      {generateScheduleName(schedule)}
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      ({schedule.map(day => daysOfWeek.find(d => d.value === day)?.label).join(", ")})
                    </span>
                  </div>
                  {scheduleOptions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSchedule(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Formulário para adicionar nova opção */}
        {!isAddingNew ? (
          <Button 
            variant="outline" 
            onClick={() => setIsAddingNew(true)}
            className="w-full"
          >
            Adicionar Nova Opção de Cronograma
          </Button>
        ) : (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <Label className="text-sm font-medium">Nova opção de cronograma:</Label>
            <div className="grid gap-3">
              {Array.from({ length: weeklyFrequency }, (_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Label className="min-w-[80px]">Dia {index + 1}:</Label>
                  <Select
                    value={newSchedule[index] || ""}
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
                          disabled={newSchedule.includes(day.value) && newSchedule[index] !== day.value}
                        >
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddSchedule} size="sm">
                Adicionar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingNew(false);
                  setNewSchedule(Array(weeklyFrequency).fill(""));
                }}
                size="sm"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={scheduleOptions.length === 0}
          className="w-full"
        >
          Salvar Cronogramas
        </Button>
      </CardContent>
    </Card>
  );
}
