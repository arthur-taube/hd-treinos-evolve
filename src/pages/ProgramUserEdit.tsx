import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { loadUserProgramForCustomize, LoadedProgramData } from "@/utils/programLoader";
import { updateUserProgram } from "@/utils/programCustomizer";
import { useAuth } from "@/contexts/AuthContext";
import { customProgramNameSchema } from "@/lib/validation";
import { HiddenExercisesDialog } from "@/components/programs/customizer/HiddenExercisesDialog";
import { CustomizerWarnings } from "@/components/programs/customizer/CustomizerWarnings";
import ExerciseKanban from "@/components/programs/ProgramEditor/ExerciseKanban";
import type { Exercise } from "@/components/programs/ProgramEditor/types";

export default function ProgramUserEdit() {
  const { programaUsuarioId } = useParams<{ programaUsuarioId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Program data
  const [programData, setProgramData] = useState<LoadedProgramData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Customization state
  const [customProgramName, setCustomProgramName] = useState("");

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

  // Saving
  const [isSaving, setIsSaving] = useState(false);

  // Track if there are unsaved changes
  const [initialState, setInitialState] = useState<{
    name: string;
    exercises: Record<string, Exercise[]>;
    titles: Record<string, string>;
  } | null>(null);

  const hasUnsavedChanges = initialState ? (
    customProgramName !== initialState.name ||
    JSON.stringify(customExercises) !== JSON.stringify(initialState.exercises) ||
    JSON.stringify(customDayTitles) !== JSON.stringify(initialState.titles)
  ) : false;

  // Load program data
  useEffect(() => {
    if (!programaUsuarioId) {
      navigate("/programs");
      return;
    }

    const loadProgram = async () => {
      console.log('🔧 ProgramUserEdit - Carregando programa do usuário:', programaUsuarioId);
      setIsLoading(true);
      
      const data = await loadUserProgramForCustomize(programaUsuarioId);
      
      if (!data) {
        console.error('❌ ProgramUserEdit - Falha ao carregar programa');
        toast({
          title: "Erro",
          description: "Não foi possível carregar o programa",
          variant: "destructive",
        });
        navigate("/programs");
        return;
      }

      console.log('✅ ProgramUserEdit - Dados carregados:', data.programName);
      
      setProgramData(data);
      setCustomProgramName(data.programName);

      // Inicializar exercícios da semana 1
      const firstMesocycleKey = "mesocycle-1";
      if (data.exercisesPerDay && data.exercisesPerDay[firstMesocycleKey]) {
        setCustomExercises(data.exercisesPerDay[firstMesocycleKey]);
      }

      // Inicializar day titles
      if (data.dayTitles) {
        setCustomDayTitles(data.dayTitles);
      }

      // Salvar estado inicial para detectar mudanças
      setInitialState({
        name: data.programName,
        exercises: data.exercisesPerDay[firstMesocycleKey] || {},
        titles: data.dayTitles || {}
      });

      setIsLoading(false);
    };

    loadProgram();
  }, [programaUsuarioId, navigate]);

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
    if (!user || !programaUsuarioId || !programData) return;

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
      await updateUserProgram({
        programaUsuarioId,
        customName: customProgramName,
        customExercises,
        customDayTitles,
      });

      toast({
        title: "Programa atualizado!",
        description: "As alterações foram salvas com sucesso",
      });

      navigate("/programs");
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as alterações",
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
      navigate("/programs");
    }
  };

  const confirmCancel = () => {
    navigate("/programs");
  };

  if (isLoading || !programData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <PageHeader title="Editar Programa">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
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
              <Label className="text-muted-foreground">Duração</Label>
              <p className="font-medium">{programData.programData.duration}</p>
            </div>
          </div>
        </Card>

        {/* Nome Personalizado */}
        <Card className="p-6 space-y-2">
          <Label htmlFor="program-name">Nome do programa</Label>
          <Input
            id="program-name"
            value={customProgramName}
            onChange={(e) => setCustomProgramName(e.target.value)}
            maxLength={80}
            placeholder="Digite um nome personalizado"
          />
          <p className="text-xs text-muted-foreground">{customProgramName.length}/80</p>
        </Card>

        {/* Info sobre propagação */}
        <Card className="p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            💡 As alterações serão aplicadas a todos os treinos <strong>não concluídos</strong> do programa.
            Treinos já realizados permanecerão inalterados.
          </p>
        </Card>

        {/* Exercise Kanban */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Exercícios</h3>
          <ExerciseKanban
            weeklyFrequency={programData.weeklyFrequency}
            daysSchedule={[]}
            currentMesocycle={1}
            totalMesocycles={1}
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
