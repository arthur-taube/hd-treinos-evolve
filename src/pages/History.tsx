
import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import HistoryProgramCard from "@/components/history/HistoryProgramCard";
import { toast } from "sonner";

// Mock data
const completedProgramsMock = [
  {
    id: "101",
    name: "Força & Potência",
    completedDate: "15/03/2025",
    details: "Programa de 8 semanas finalizado com sucesso"
  },
  {
    id: "102",
    name: "Fundamentos HD",
    completedDate: "02/01/2025",
    details: "Programa de 6 semanas para iniciantes"
  },
];

const History = () => {
  const [completedPrograms, setCompletedPrograms] = useState(completedProgramsMock);

  const handleDelete = (id: string) => {
    setCompletedPrograms(completedPrograms.filter(program => program.id !== id));
  };

  const handleRestart = (id: string) => {
    const program = completedPrograms.find(program => program.id === id);
    if (program) {
      toast.success(`O programa ${program.name} foi reiniciado`);
    }
  };

  const handleViewDetails = (id: string) => {
    const program = completedPrograms.find(program => program.id === id);
    if (program) {
      toast.info(`Detalhes do programa: ${program.details}`);
    }
  };

  return (
    <div className="pb-20">
      <PageHeader title="Histórico" />

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-3">Programas Finalizados</h2>
          {completedPrograms.length > 0 ? (
            <div className="space-y-3">
              {completedPrograms.map(program => (
                <HistoryProgramCard 
                  key={program.id}
                  name={program.name}
                  completedDate={program.completedDate}
                  onDelete={() => handleDelete(program.id)}
                  onRestart={() => handleRestart(program.id)}
                  onViewDetails={() => handleViewDetails(program.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card p-4 rounded-lg border border-border/40 text-center">
              <p className="text-muted-foreground">
                Nenhum programa finalizado
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default History;
