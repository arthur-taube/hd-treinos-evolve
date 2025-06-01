
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import ProgramExercisesForm from "@/components/programs/ProgramEditor/ProgramExercisesForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { loadExistingProgram, LoadedProgramData } from "@/utils/programLoader";

export default function ProgramEditorEdit() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [programData, setProgramData] = useState<LoadedProgramData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProgram = async () => {
      if (!programId) {
        toast({
          title: "Erro",
          description: "ID do programa não encontrado",
          variant: "destructive"
        });
        navigate("/programs");
        return;
      }

      setIsLoading(true);
      const data = await loadExistingProgram(programId);
      
      if (!data) {
        toast({
          title: "Erro ao carregar programa",
          description: "Não foi possível carregar os dados do programa",
          variant: "destructive"
        });
        navigate("/programs");
        return;
      }

      setProgramData(data);
      setIsLoading(false);
    };

    loadProgram();
  }, [programId, navigate]);

  if (isLoading) {
    return (
      <div className="pb-20">
        <PageHeader title="Carregando programa...">
          <Button variant="outline" onClick={() => navigate("/programs")}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </PageHeader>
        <div className="flex items-center justify-center p-8">
          <p>Carregando dados do programa...</p>
        </div>
      </div>
    );
  }

  if (!programData) {
    return (
      <div className="pb-20">
        <PageHeader title="Erro">
          <Button variant="outline" onClick={() => navigate("/programs")}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </PageHeader>
        <div className="flex items-center justify-center p-8">
          <p>Programa não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <PageHeader title={`Editando: ${programData.programName}`}>
        <Button variant="outline" onClick={() => navigate("/programs")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </PageHeader>
      <ProgramExercisesForm
        programName={programData.programName}
        programLevel={programData.programLevel}
        weeklyFrequency={programData.weeklyFrequency}
        mesocycles={programData.mesocycles}
        programData={programData.programData}
        initialExercisesPerDay={programData.exercisesPerDay}
        initialSavedSchedules={programData.savedSchedules}
        initialMesocycleDurations={programData.mesocycleDurations}
        isEditing={true}
        programId={programId}
      />
    </div>
  );
}
