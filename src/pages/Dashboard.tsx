
import PageHeader from "@/components/layout/PageHeader";
import NextWorkoutCard from "@/components/dashboard/NextWorkoutCard";
import ProgramCard from "@/components/dashboard/ProgramCard";
import StatCard from "@/components/dashboard/StatCard";
import { Calendar, CalendarDaysIcon, Dumbbell, History } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const { activeProgram, nextWorkout, stats, lastWorkout, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="pb-20">
        <PageHeader title="Meu Painel" />
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <PageHeader title="Meu Painel" />

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-3">Meus Programas</h2>
          {activeProgram ? (
            <ProgramCard
              title={activeProgram.nome}
              subtitle={`Programa ativo - Progresso: ${activeProgram.progresso}%`}
              showPlayButton
              onClick={() => navigate('/active-program')}
            />
          ) : (
            <div className="bg-card p-4 rounded-lg border border-border/40 text-center">
              <p className="text-muted-foreground">
                Você ainda não possui um programa ativo
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-medium mb-3">Próximo Treino</h2>
          {nextWorkout ? (
            <NextWorkoutCard
              programName={activeProgram?.nome || ""}
              workoutDay={`${nextWorkout.dia}: ${nextWorkout.nome}`}
              date={nextWorkout.data}
              weekday={nextWorkout.diaSemana}
              onStart={() => navigate('/active-program')}
            />
          ) : (
            <div className="bg-card p-4 rounded-lg border border-border/40 text-center">
              <p className="text-muted-foreground">
                Nenhum treino pendente
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-medium mb-3">Calendário</h2>
          <div className="bg-card rounded-lg border border-border/40 p-4">
            {/* This is a placeholder for the calendar component */}
            <div className="flex items-center justify-center h-[200px]">
              <CalendarDaysIcon className="h-10 w-10 text-muted-foreground" />
              <p className="ml-2 text-muted-foreground">
                Calendário de treinos
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-3">Minhas Estatísticas</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Total de Treinos"
              value={stats.totalWorkouts}
              icon={<Dumbbell size={20} />}
            />
            <StatCard
              title="Treinos este Mês"
              value={stats.workoutsThisMonth}
              icon={<Calendar size={20} />}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-3">Histórico</h2>
          {lastWorkout ? (
            <ProgramCard
              title={`Último treino - ${lastWorkout.programa_nome}`}
              subtitle={`${lastWorkout.treino_nome} - ${lastWorkout.data}`}
              onClick={() => navigate('/history')}
            />
          ) : (
            <div className="bg-card p-4 rounded-lg border border-border/40 text-center">
              <p className="text-muted-foreground">
                Nenhum treino concluído ainda
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
