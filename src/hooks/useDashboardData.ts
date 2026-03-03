import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveProgram {
  id: string;
  nome: string;
  nome_personalizado: string | null;
  progresso: number;
  data_inicio: string;
}

interface NextWorkout {
  nome: string;
  dia: string;
  data: string;
  diaSemana: string;
}

interface Stats {
  totalWorkouts: number;
  workoutsThisMonth: number;
}

export function useDashboardData() {
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);
  const [nextWorkout, setNextWorkout] = useState<NextWorkout | null>(null);
  const [stats, setStats] = useState<Stats>({ totalWorkouts: 0, workoutsThisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      // Get active program
      const { data: activeProgramData } = await supabase
        .from('programas_usuario')
        .select(`
          id,
          progresso,
          data_inicio,
          nome_personalizado,
          programas!inner(nome)
        `)
        .eq('usuario_id', userId)
        .eq('ativo', true)
        .single();

      if (activeProgramData) {
        // Calculate real progress from workouts
        const { data: workouts } = await supabase
          .from('treinos_usuario')
          .select('concluido')
          .eq('programa_usuario_id', activeProgramData.id);

        const total = workouts?.length || 0;
        const completed = workouts?.filter(w => w.concluido).length || 0;
        const realProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

        setActiveProgram({
          id: activeProgramData.id,
          nome: activeProgramData.programas.nome,
          nome_personalizado: activeProgramData.nome_personalizado,
          progresso: realProgress,
          data_inicio: activeProgramData.data_inicio
        });

        // Get next workout
        const { data: nextWorkoutData } = await supabase
          .from('treinos_usuario')
          .select('nome, ordem_semana')
          .eq('programa_usuario_id', activeProgramData.id)
          .eq('concluido', false)
          .order('ordem_semana')
          .limit(1)
          .single();

        if (nextWorkoutData) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 1);
          
          setNextWorkout({
            nome: nextWorkoutData.nome,
            dia: `Dia ${nextWorkoutData.ordem_semana}`,
            data: nextDate.toLocaleDateString('pt-BR'),
            diaSemana: nextDate.toLocaleDateString('pt-BR', { weekday: 'long' })
          });
        }
      }

      // Get stats
      const { data: completedWorkouts } = await supabase
        .from('treinos_usuario')
        .select('data_concluido')
        .eq('concluido', true)
        .not('data_concluido', 'is', null);

      const totalWorkouts = completedWorkouts?.length || 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const workoutsThisMonth = completedWorkouts?.filter(workout => {
        const workoutDate = new Date(workout.data_concluido);
        return workoutDate.getMonth() === currentMonth && workoutDate.getFullYear() === currentYear;
      }).length || 0;

      setStats({ totalWorkouts, workoutsThisMonth });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    activeProgram,
    nextWorkout,
    stats,
    loading
  };
}
