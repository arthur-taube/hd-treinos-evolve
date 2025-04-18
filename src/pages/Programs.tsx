
import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import ProgramCard from "@/components/programs/ProgramCard";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Mock data
const activeProgramsMock = [
  {
    id: "1",
    name: "Hipertrofia Total HD",
    description: "Programa avançado - 12 semanas",
    isPaused: false,
  },
];

const pausedProgramsMock = [
  {
    id: "2",
    name: "Definição Extrema",
    description: "Programa intermediário - 8 semanas",
    isPaused: true,
  },
  {
    id: "3",
    name: "Força Básica HD",
    description: "Programa iniciante - 6 semanas",
    isPaused: true,
  },
];

const Programs = () => {
  const [activePrograms, setActivePrograms] = useState(activeProgramsMock);
  const [pausedPrograms, setPausedPrograms] = useState(pausedProgramsMock);
  const userEmail = "usuario@exemplo.com"; // Mock user email
  const isAdmin = userEmail === "arthurtaube.com.br@gmail.com";

  const handleResume = (id: string) => {
    // Move program from paused to active
    const programToResume = pausedPrograms.find((program) => program.id === id);
    if (programToResume) {
      setPausedPrograms(pausedPrograms.filter((program) => program.id !== id));
      setActivePrograms([
        ...activePrograms,
        { ...programToResume, isPaused: false },
      ]);
      toast.success(`Programa "${programToResume.name}" retomado com sucesso!`);
    }
  };

  const handlePause = (id: string) => {
    // Move program from active to paused
    const programToPause = activePrograms.find((program) => program.id === id);
    if (programToPause) {
      setActivePrograms(activePrograms.filter((program) => program.id !== id));
      setPausedPrograms([
        ...pausedPrograms,
        { ...programToPause, isPaused: true },
      ]);
      toast.success(`Programa "${programToPause.name}" pausado com sucesso!`);
    }
  };

  const handleDelete = (id: string, isPaused: boolean) => {
    // Delete program from appropriate list
    if (isPaused) {
      setPausedPrograms(pausedPrograms.filter((program) => program.id !== id));
    } else {
      setActivePrograms(activePrograms.filter((program) => program.id !== id));
    }
  };

  const handleChooseProgram = () => {
    toast.info("Funcionalidade de escolha de programa em desenvolvimento");
  };

  const handleCreateProgram = () => {
    if (isAdmin) {
      toast.info("Funcionalidade de criação de programa em desenvolvimento");
    } else {
      toast.error("Apenas administradores podem criar novos programas");
    }
  };

  return (
    <div className="pb-20">
      <PageHeader title="Meus Programas" />

      <div className="mb-6">
        <Button className="w-full btn-primary" onClick={handleChooseProgram}>
          Escolher um novo programa
        </Button>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-3">Programa Ativo</h2>
          <div className="space-y-3">
            {activePrograms.length > 0 ? (
              activePrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  name={program.name}
                  description={program.description}
                  isPaused={program.isPaused}
                  onPause={() => handlePause(program.id)}
                  onEdit={() => toast.info("Função de edição em desenvolvimento")}
                  onFinish={() => handleDelete(program.id, false)}
                  onDelete={() => handleDelete(program.id, false)}
                />
              ))
            ) : (
              <div className="bg-card p-4 rounded-lg border border-border/40 text-center">
                <p className="text-muted-foreground">
                  Nenhum programa ativo no momento
                </p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-3">Programas Pausados</h2>
          <div className="space-y-3">
            {pausedPrograms.length > 0 ? (
              pausedPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  name={program.name}
                  description={program.description}
                  isPaused={program.isPaused}
                  onResume={() => handleResume(program.id)}
                  onEdit={() => toast.info("Função de edição em desenvolvimento")}
                  onFinish={() => handleDelete(program.id, true)}
                  onDelete={() => handleDelete(program.id, true)}
                />
              ))
            ) : (
              <div className="bg-card p-4 rounded-lg border border-border/40 text-center">
                <p className="text-muted-foreground">
                  Nenhum programa pausado
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="pt-4">
          <Button
            onClick={handleCreateProgram}
            className={`w-full ${
              isAdmin
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-muted cursor-not-allowed"
            } text-white font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-all`}
            disabled={!isAdmin}
          >
            {isAdmin ? (
              <>
                <Plus size={18} />
                Criar novo programa
              </>
            ) : (
              <>
                <AlertTriangle size={18} />
                Acesso restrito para desenvolvedores
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Programs;
