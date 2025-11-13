import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { loadExistingProgram, LoadedProgramData } from "@/utils/programLoader";
import { saveCustomizedProgram } from "@/utils/programCustomizer";
import { useAuth } from "@/contexts/AuthContext";
import { customProgramNameSchema } from "@/lib/validation";
import { useCustomizerAutoSave } from "@/hooks/useCustomizerAutoSave";
import { useNavigationBlocker } from "@/hooks/useNavigationBlocker";
import { ProgramScheduleSelector } from "@/components/programs/customizer/ProgramScheduleSelector";
import { HiddenExercisesDialog } from "@/components/programs/customizer/HiddenExercisesDialog";
import { CustomizerWarnings } from "@/components/programs/customizer/CustomizerWarnings";
import ExerciseKanban from "@/components/programs/ProgramEditor/ExerciseKanban";
import type { Exercise } from "@/components/programs/ProgramEditor/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CronogramaConfig {
  tipo: "recomendado" | "personalizado" | "flexivel";
  recomendadoIndex: number | null;
  personalizadoDias: string[];
  flexivelDiasTreino: number;
  flexivelDiasDescanso: number;
  flexivelDesconsiderar: {
    domingos: boolean;
    sabados: boolean;
    outros: string[];
  };
}

export default function ProgramCustomize() {
  console.log('🚀 ProgramCustomize - Componente iniciado');
  
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  console.log('🚀 ProgramCustomize - programId:', programId);
  console.log('🚀 ProgramCustomize - user:', user?.id);

  // Program data
  const [programData, setProgramData] = useState<LoadedProgramData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Customization state
  const [customProgramName, setCustomProgramName] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [cronogramaConfig, setCronogramaConfig] = useState<CronogramaConfig>({
    tipo: "recomendado",
    recomendadoIndex: 0,
    personalizadoDias: [],
    flexivelDiasTreino: 4,
    flexivelDiasDescanso: 2,
    flexivelDesconsiderar: {
      domingos: false,
      sabados: false,
      outros: [],
    },
  });

  // Exercises state
  const [customExercises, setCustomExercises] = useState<Record<string, Exercise[]>>({});
  const [customDayTitles, setCustomDayTitles] = useState<Record<string, string>>({});

  // Warning state
  const [hasShownDayOrderWarning, setHasShownDayOrderWarning] = useState(false);
  const [showDayOrderWarning, setShowDayOrderWarning] = useState(false);
  const [showMoveExerciseWarning, setShowMoveExerciseWarning] = useState(false);
  const [pendingExerciseMove, setPendingExerciseMove] = useState<any>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showHiddenExercisesDialog, setShowHiddenExercisesDialog] = useState(false);
  const [selectedDayForHidden, setSelectedDayForHidden] = useState<string | null>(null);

  // Validation
  const [scheduleValidationError, setScheduleValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save and navigation blocking
  const hasUnsavedChanges = customProgramName !== "" || Object.keys(customExercises).length > 0;
  const { clearCache, loadCache } = useCustomizerAutoSave(
    programId || "",
    { customProgramName, cronogramaConfig, customExercises, customDayTitles, startDate },
    isLoading
  );
  // const blocker = useNavigationBlocker(hasUnsavedChanges); // Temporarily disabled - requires createBrowserRouter

  // Load program data
  useEffect(() => {
    if (!programId) {
      navigate("/program-catalog");
      return;
    }

    const loadProgram = async () => {
      console.log('🔧 ProgramCustomize - Iniciando carregamento do programa:', programId);
      setIsLoading(true);
      
      const data = await loadExistingProgram(programId);
      
      console.log('🔧 ProgramCustomize - Dados recebidos:', data);

      if (!data) {
        console.error('❌ ProgramCustomize - Falha ao carregar programa');
        toast({
          title: "Erro",
          description: "Não foi possível carregar o programa",
          variant: "destructive",
        });
        navigate("/program-catalog");
        return;
      }

      console.log('🔧 ProgramCustomize - Estrutura de exercisesPerDay:', Object.keys(data.exercisesPerDay));
      console.log('🔧 ProgramCustomize - Day titles:', data.dayTitles);

      console.log('🔧 ProgramCustomize - Configurando programData');
      setProgramData(data);
      setCustomProgramName(data.programName);

      // Inicializar exercícios da semana 1 do primeiro mesociclo
      const firstMesocycleKey = "mesocycle-1";
      console.log('🔧 ProgramCustomize - Verificando exercícios para:', firstMesocycleKey);
      console.log('🔧 ProgramCustomize - exercisesPerDay disponível:', data.exercisesPerDay);
      
      if (data.exercisesPerDay && data.exercisesPerDay[firstMesocycleKey]) {
        console.log('✅ Exercícios encontrados para mesocycle-1:', data.exercisesPerDay[firstMesocycleKey]);
        setCustomExercises(data.exercisesPerDay[firstMesocycleKey]);
      } else {
        console.warn('⚠️ Nenhum exercício encontrado para mesocycle-1');
        console.log('Chaves disponíveis em exercisesPerDay:', Object.keys(data.exercisesPerDay || {}));
        // Garantir que sempre temos um objeto válido, mesmo que vazio
        setCustomExercises({});
      }

      // Inicializar day titles
      if (data.dayTitles) {
        console.log('✅ Configurando dayTitles:', data.dayTitles);
        setCustomDayTitles(data.dayTitles);
      } else {
        console.warn('⚠️ dayTitles vazio ou indefinido');
      }

      // Inicializar cronograma recomendado se disponível
      if (data.savedSchedules.length > 0) {
        console.log('✅ Configurando cronograma recomendado:', data.savedSchedules[0]);
        setCronogramaConfig((prev) => ({
          ...prev,
          recomendadoIndex: 0,
          personalizadoDias: data.savedSchedules[0],
        }));
      }

      // Tentar carregar cache
      const cached = loadCache();
      if (cached) {
        console.log('📦 Cache encontrado, restaurando estado');
        setCustomProgramName(cached.customProgramName);
        setCronogramaConfig(cached.cronogramaConfig);
        setCustomExercises(cached.customExercises);
        setCustomDayTitles(cached.customDayTitles);
        setStartDate(cached.startDate);
      }

      console.log('✅ ProgramCustomize - Carregamento concluído com sucesso');
      setIsLoading(false);
    };

    loadProgram();
  }, [programId, navigate]);

  // Get hidden exercises
  const getHiddenExercises = () => {
    const hidden: Array<{ dayId: string; exercise: Exercise }> = [];
    Object.entries(customExercises).forEach(([dayId, exercises]) => {
      exercises.forEach((exercise) => {
        if (exercise.hidden) {
          hidden.push({ dayId, exercise });
        }
      });
    });
    return hidden;
  };

  // Handle add hidden exercise
  const handleAddHiddenExercise = (dayId: string, exercise: Exercise) => {
    setCustomExercises((prev) => ({
      ...prev,
      [dayId]: prev[dayId].map((ex) =>
        ex.id === exercise.id ? { ...ex, hidden: false } : ex
      ),
    }));
  };

  // Handle delete/hide exercise
  const handleDeleteExercise = (dayId: string, exerciseId: string) => {
    setCustomExercises((prev) => ({
      ...prev,
      [dayId]: prev[dayId].map((ex) =>
        ex.id === exerciseId ? { ...ex, hidden: true } : ex
      ),
    }));
  };

  // Handle save
  const handleSave = async () => {
    if (!user || !programId || !programData) return;

    // Validar nome do programa
    const nameValidation = customProgramNameSchema.safeParse(customProgramName);
    if (!nameValidation.success) {
      toast({
        title: "Nome inválido",
        description: nameValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Validar cronograma
    if (cronogramaConfig.tipo === "personalizado" && cronogramaConfig.personalizadoDias.length === 0) {
      toast({
        title: "Cronograma incompleto",
        description: "Por favor, configure seu cronograma personalizado",
        variant: "destructive",
      });
      return;
    }

    if (scheduleValidationError) {
      toast({
        title: "Data inválida",
        description: scheduleValidationError,
        variant: "destructive",
      });
      return;
    }

    // Verificar se há pelo menos 1 exercício visível por dia
    const hasVisibleExercises = Object.values(customExercises).every((exercises) =>
      exercises.some((ex) => !ex.hidden)
    );

    if (!hasVisibleExercises) {
      toast({
        title: "Programa inválido",
        description: "Cada dia deve ter pelo menos um exercício visível",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      await saveCustomizedProgram({
        userId: user.id,
        programId,
        customName: customProgramName,
        startDate,
        cronogramaConfig,
        customExercises,
        customDayTitles,
        programData,
      });

      clearCache();

      toast({
        title: "Programa customizado!",
        description: "Seu programa foi configurado e está pronto para começar",
      });

      navigate("/programs");
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o programa",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirmation(true);
    } else {
      navigate("/program-catalog");
    }
  };

  const confirmCancel = () => {
    clearCache();
    navigate("/program-catalog");
  };

  if (isLoading || !programData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Validação adicional de dados críticos
  if (!programData.weeklyFrequency || programData.weeklyFrequency === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-6">
          <p className="text-destructive">
            Erro: Programa com configuração inválida. Por favor, volte ao catálogo e tente outro programa.
          </p>
          <Button onClick={() => navigate("/program-catalog")} className="mt-4">
            Voltar ao Catálogo
          </Button>
        </Card>
      </div>
    );
  }

  console.log('🎨 ProgramCustomize - Renderizando interface completa');
  console.log('🎨 ProgramCustomize - programData:', {
    programName: programData.programName,
    weeklyFrequency: programData.weeklyFrequency,
    mesocycles: programData.mesocycles,
    customExercisesKeys: Object.keys(customExercises),
    customDayTitlesKeys: Object.keys(customDayTitles)
  });

  return (
    <div className="pb-20">
      <PageHeader title="Customize seu Programa">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !!scheduleValidationError}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar e Iniciar"
            )}
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-6 mt-6">
        {/* Dados do Programa */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Dados do Programa</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Nome</Label>
              <p className="font-medium">{programData.programName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Nível</Label>
              <p className="font-medium capitalize">{programData.programLevel}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Frequência Semanal</Label>
              <p className="font-medium">{programData.weeklyFrequency}x por semana</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Mesociclos</Label>
              <p className="font-medium">{programData.mesocycles}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Duração</Label>
              <p className="font-medium">
                {programData.mesocycleDurations?.[0] || 4} semanas
              </p>
            </div>
          </div>
        </Card>

        {/* Nome Personalizado */}
        <Card className="p-6 space-y-2">
          <Label htmlFor="program-name">Nomeie seu programa</Label>
          <Input
            id="program-name"
            value={customProgramName}
            onChange={(e) => setCustomProgramName(e.target.value)}
            maxLength={80}
            placeholder="Digite um nome personalizado"
          />
          <p className="text-xs text-muted-foreground">{customProgramName.length}/80</p>
        </Card>

        {/* Cronograma */}
        <ProgramScheduleSelector
          cronogramasRecomendados={programData.savedSchedules}
          weeklyFrequency={programData.weeklyFrequency}
          config={cronogramaConfig}
          onConfigChange={(updates) =>
            setCronogramaConfig((prev) => ({ ...prev, ...updates }))
          }
          startDate={startDate}
          onValidationError={setScheduleValidationError}
        />

        {scheduleValidationError && (
          <p className="text-sm text-destructive">{scheduleValidationError}</p>
        )}

        {/* Data de Início */}
        <Card className="p-6 space-y-2">
          <Label>Data de início do treino</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(startDate, "PPP", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
                disabled={(date) => date < new Date()}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </Card>

        {/* Exercise Kanban */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Exercícios - Semana 1</h3>
          <ExerciseKanban
            weeklyFrequency={programData.weeklyFrequency}
            daysSchedule={[]}
            currentMesocycle={1}
            totalMesocycles={programData.mesocycles}
            mesocycleDuration={programData.mesocycleDurations?.[0] || 4}
            initialExercises={customExercises}
            initialDayTitles={customDayTitles}
            mode="customize"
            onExercisesUpdate={(dayId, exercises) =>
              setCustomExercises((prev) => ({ ...prev, [dayId]: exercises }))
            }
            onDayTitlesUpdate={setCustomDayTitles}
            onShowDayHiddenExercises={(dayId) => {
              setSelectedDayForHidden(dayId);
              setShowHiddenExercisesDialog(true);
            }}
            onDeleteExercise={handleDeleteExercise}
            maxSets={3}
            onMoveExerciseBetweenDays={(sourceDay, destDay, exercise) => {
              setPendingExerciseMove({ sourceDay, destDay, exercise });
              setShowMoveExerciseWarning(true);
            }}
            onReorderDays={() => {
              if (!hasShownDayOrderWarning) {
                setShowDayOrderWarning(true);
              }
            }}
          />
        </div>
      </div>

      {/* Dialogs */}
      <HiddenExercisesDialog
        open={showHiddenExercisesDialog}
        onClose={() => {
          setShowHiddenExercisesDialog(false);
          setSelectedDayForHidden(null);
        }}
        hiddenExercises={getHiddenExercises()}
        dayId={selectedDayForHidden || undefined}
        onAddExercise={handleAddHiddenExercise}
      />

      <CustomizerWarnings
        showDayOrderWarning={showDayOrderWarning}
        onDayOrderConfirm={() => {
          setShowDayOrderWarning(false);
          setHasShownDayOrderWarning(true);
        }}
        showMoveExerciseWarning={showMoveExerciseWarning}
        onMoveExerciseConfirm={() => {
          if (pendingExerciseMove) {
            // Processar o movimento
            const { sourceDay, destDay, exercise } = pendingExerciseMove;
            setCustomExercises((prev) => {
              const newExercises = { ...prev };
              newExercises[sourceDay] = newExercises[sourceDay].filter(
                (ex) => ex.id !== exercise.id
              );
              newExercises[destDay] = [...newExercises[destDay], exercise];
              return newExercises;
            });
          }
          setShowMoveExerciseWarning(false);
          setPendingExerciseMove(null);
        }}
        onMoveExerciseCancel={() => {
          setShowMoveExerciseWarning(false);
          setPendingExerciseMove(null);
        }}
        showCancelConfirmation={showCancelConfirmation}
        onCancelConfirm={confirmCancel}
        onCancelCancel={() => setShowCancelConfirmation(false)}
        showNavigationWarning={false}
        onNavigationProceed={() => {}}
        onNavigationCancel={() => {}}
      />
    </div>
  );
}
