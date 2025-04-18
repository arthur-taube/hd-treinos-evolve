
import PageHeader from "@/components/layout/PageHeader";
import NextWorkoutCard from "@/components/dashboard/NextWorkoutCard";
import ProgramCard from "@/components/dashboard/ProgramCard";
import StatCard from "@/components/dashboard/StatCard";
import { Calendar, CalendarDaysIcon, Dumbbell, History } from "lucide-react";

const Dashboard = () => {
  // Mock data - would come from API in real app
  const hasActiveProgram = true;
  const totalWorkouts = 36;

  return (
    <div className="pb-20">
      <PageHeader title="Meu Painel" />

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-3">Meus Programas</h2>
          {hasActiveProgram ? (
            <ProgramCard
              title="Hipertrofia Total HD"
              subtitle="Programa ativo - Semana 2"
              showPlayButton
              onClick={() => {}}
            />
          ) : (
            <div className="bg-card p-4 rounded-lg border border-border/40 text-center">
              <p className="text-muted-foreground">
                Você ainda não registrou nenhum treino
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-medium mb-3">Próximo Treino</h2>
          <NextWorkoutCard
            programName="Hipertrofia Total HD"
            workoutDay="Dia 8: Quadríceps + Posterior + Panturrilha"
            date="19/04/2025"
            weekday="Sexta-feira"
            onStart={() => {}}
          />
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
              value={totalWorkouts}
              icon={<Dumbbell size={20} />}
            />
            <StatCard
              title="Treinos este Mês"
              value={12}
              icon={<Calendar size={20} />}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-3">Histórico</h2>
          <ProgramCard
            title="Último treino - Hipertrofia Total HD"
            subtitle="Dia 7: Peito + Tríceps - 17/04/2025"
            onClick={() => {}}
          />
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
