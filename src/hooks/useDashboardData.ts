import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveProgram {
  id: string;
  nome: string;
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

interface LastWorkout {
  programa_nome: string;
  treino_nome: string;
  data: string;
}

export function useDashboardData() {
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);
  const [nextWorkout, setNextWorkout] = useState<NextWorkout | null>(null);
  const [stats, setStats] = useState<Stats>({ totalWorkouts: 0, workoutsThisMonth: 0 });
  const [lastWorkout, setLastWorkout] = useState<LastWorkout | null>(null);
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
          programas!inner(nome)
        `)
        .eq('usuario_id', userId)
        .eq('ativo', true)
        .single();

      if (activeProgramData) {
        setActiveProgram({
          id: activeProgramData.id,
          nome: activeProgramData.programas.nome,
          progresso: activeProgramData.progresso,
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

      // Get last completed workout
      const { data: lastWorkoutData } = await supabase
        .from('treinos_usuario')
        .select(`
          nome,
          data_concluido,
          programas_usuario!inner(
            programas!inner(nome)
          )
        `)
        .eq('concluido', true)
        .not('data_concluido', 'is', null)
        .order('data_concluido', { ascending: false })
        .limit(1)
        .single();

      if (lastWorkoutData) {
        setLastWorkout({
          programa_nome: lastWorkoutData.programas_usuario.programas.nome,
          treino_nome: lastWorkoutData.nome,
          data: new Date(lastWorkoutData.data_concluido).toLocaleDateString('pt-BR')
        });
      }

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
    lastWorkout,
    loading
  };
}