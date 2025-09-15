
import PageHeader from "@/components/layout/PageHeader";
import HistoryProgramCard from "@/components/history/HistoryProgramCard";
import { useHistoryData } from "@/hooks/useHistoryData";

const History = () => {
  const { completedPrograms, loading, handleDelete, handleRestart, handleViewDetails } = useHistoryData();

  if (loading) {
    return (
      <div className="pb-20">
        <PageHeader title="Histórico" />
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

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
                  name={program.nome}
                  completedDate={program.dataFinalizacao}
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
