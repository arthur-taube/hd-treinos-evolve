import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface FlexibleDesconsiderar {
  domingos: boolean;
  sabados: boolean;
  outros: string[];
}

interface CronogramaConfig {
  tipo: "recomendado" | "personalizado" | "flexivel";
  recomendadoIndex: number | null;
  personalizadoDias: string[];
  flexivelDiasTreino: number;
  flexivelDiasDescanso: number;
  flexivelDesconsiderar: FlexibleDesconsiderar;
}

interface ProgramScheduleSelectorProps {
  cronogramasRecomendados: string[][];
  weeklyFrequency: number;
  config: CronogramaConfig;
  onConfigChange: (config: Partial<CronogramaConfig>) => void;
  startDate: Date;
  onValidationError: (error: string | null) => void;
}

const DIAS_SEMANA = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

export function ProgramScheduleSelector({
  cronogramasRecomendados,
  weeklyFrequency,
  config,
  onConfigChange,
  startDate,
  onValidationError,
}: ProgramScheduleSelectorProps) {
  const [tempPersonalizadoDias, setTempPersonalizadoDias] = useState<string[]>(
    Array(weeklyFrequency).fill("")
  );

  // Validar data com cronograma flexível
  useEffect(() => {
    if (config.tipo === "flexivel" && startDate) {
      const dayOfWeek = startDate.getDay();
      const dayName = DIAS_SEMANA.find((_, idx) => idx === (dayOfWeek === 0 ? 6 : dayOfWeek - 1))?.value;
      
      const isExcluded =
        (config.flexivelDesconsiderar.domingos && dayOfWeek === 0) ||
        (config.flexivelDesconsiderar.sabados && dayOfWeek === 6) ||
        (config.flexivelDesconsiderar.outros && dayName && config.flexivelDesconsiderar.outros.includes(dayName));

      if (isExcluded) {
        onValidationError(
          `A data de início (${startDate.toLocaleDateString("pt-BR")}) cai em um dia desconsiderado. Por favor, escolha uma data válida.`
        );
      } else {
        onValidationError(null);
      }
    } else {
      onValidationError(null);
    }
  }, [startDate, config.tipo, config.flexivelDesconsiderar, onValidationError]);

  const handleSavePersonalizado = () => {
    if (tempPersonalizadoDias.every((dia) => dia !== "")) {
      onConfigChange({ personalizadoDias: tempPersonalizadoDias });
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <Label>Escolha seu cronograma</Label>
        <Select
          value={config.tipo}
          onValueChange={(value: "recomendado" | "personalizado" | "flexivel") =>
            onConfigChange({ tipo: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recomendado">Cronogramas Recomendados</SelectItem>
            <SelectItem value="personalizado">Escolher Meus Dias</SelectItem>
            <SelectItem value="flexivel">Cronograma Flexível</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cronogramas Recomendados */}
      {config.tipo === "recomendado" && (
        <RadioGroup
          value={config.recomendadoIndex?.toString()}
          onValueChange={(value) => {
            const index = parseInt(value);
            onConfigChange({
              recomendadoIndex: index,
              personalizadoDias: cronogramasRecomendados[index],
            });
          }}
        >
          {cronogramasRecomendados.map((cronograma, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={index.toString()} id={`crono-${index}`} />
              <Label htmlFor={`crono-${index}`} className="cursor-pointer">
                {cronograma.map((dia) => DIAS_SEMANA.find((d) => d.value === dia)?.label).join(", ")}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {/* Escolher Meus Dias */}
      {config.tipo === "personalizado" && (
        <div className="space-y-3">
          {tempPersonalizadoDias.map((dia, index) => (
            <div key={index} className="space-y-1">
              <Label>Dia de Treino {index + 1}</Label>
              <Select
                value={dia}
                onValueChange={(value) => {
                  const newDias = [...tempPersonalizadoDias];
                  newDias[index] = value;
                  setTempPersonalizadoDias(newDias);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button
            onClick={handleSavePersonalizado}
            disabled={!tempPersonalizadoDias.every((dia) => dia !== "")}
            className="w-full"
          >
            Salvar Cronograma
          </Button>
          {config.personalizadoDias.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              ✓ Cronograma salvo
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onConfigChange({ personalizadoDias: [] })}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Cronograma Flexível */}
      {config.tipo === "flexivel" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Input
              type="number"
              min={1}
              max={7}
              value={config.flexivelDiasTreino}
              onChange={(e) =>
                onConfigChange({ flexivelDiasTreino: parseInt(e.target.value) || 1 })
              }
              className="w-20"
            />
            <span>dias de treino para cada</span>
            <Input
              type="number"
              min={1}
              max={7}
              value={config.flexivelDiasDescanso}
              onChange={(e) =>
                onConfigChange({ flexivelDiasDescanso: parseInt(e.target.value) || 1 })
              }
              className="w-20"
            />
            <span>dias de descanso</span>
          </div>

          <div className="space-y-3">
            <Label>Desconsiderar:</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="desc-domingos"
                  checked={config.flexivelDesconsiderar.domingos}
                  onCheckedChange={(checked) =>
                    onConfigChange({
                      flexivelDesconsiderar: {
                        ...config.flexivelDesconsiderar,
                        domingos: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="desc-domingos" className="cursor-pointer">
                  Domingos
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="desc-sabados"
                  checked={config.flexivelDesconsiderar.sabados}
                  onCheckedChange={(checked) =>
                    onConfigChange({
                      flexivelDesconsiderar: {
                        ...config.flexivelDesconsiderar,
                        sabados: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="desc-sabados" className="cursor-pointer">
                  Sábados
                </Label>
              </div>

              <Select
                onValueChange={(value) => {
                  const outros = config.flexivelDesconsiderar.outros || [];
                  if (!outros.includes(value)) {
                    onConfigChange({
                      flexivelDesconsiderar: {
                        ...config.flexivelDesconsiderar,
                        outros: [...outros, value],
                      },
                    });
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Outro dia" />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.slice(0, 5).map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config.flexivelDesconsiderar.outros.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.flexivelDesconsiderar.outros.map((dia) => (
                  <div
                    key={dia}
                    className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm"
                  >
                    {DIAS_SEMANA.find((d) => d.value === dia)?.label}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() =>
                        onConfigChange({
                          flexivelDesconsiderar: {
                            ...config.flexivelDesconsiderar,
                            outros: config.flexivelDesconsiderar.outros.filter(
                              (d) => d !== dia
                            ),
                          },
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
