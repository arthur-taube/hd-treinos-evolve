import { supabase } from '@/integrations/supabase/client';

export interface LoadedProgramData {
  programName: string;
  programLevel: string;
  weeklyFrequency: number;
  mesocycles: number;
  programData: {
    duration: string;
    goals: string[];
    split: string;
  };
  exercisesPerDay: Record<string, Record<string, any[]>>;
  savedSchedules: string[][];
  mesocycleDurations: number[];
}

export const loadExistingProgram = async (programId: string): Promise<LoadedProgramData | null> => {
  try {
    // Buscar programa
    const { data: programa, error: programaError } = await supabase
      .from('programas')
      .select('*')
      .eq('id', programId)
      .single();

    if (programaError || !programa) {
      console.error('Erro ao carregar programa:', programaError);
      return null;
    }

    // Buscar mesociclos
    const { data: mesociclos, error: mesociclosError } = await supabase
      .from('mesociclos')
      .select('*')
      .eq('programa_id', programId)
      .order('numero');

    if (mesociclosError) {
      console.error('Erro ao carregar mesociclos:', mesociclosError);
      return null;
    }

    // Buscar treinos
    const { data: treinos, error: treinosError } = await supabase
      .from('treinos')
      .select('*')
      .eq('programa_id', programId)
      .order('ordem_semana');

    if (treinosError) {
      console.error('Erro ao carregar treinos:', treinosError);
      return null;
    }

    // Buscar exercícios de todos os treinos
    const treinoIds = treinos?.map(t => t.id) || [];
    const { data: exercicios, error: exerciciosError } = await supabase
      .from('exercicios_treino')
      .select('*')
      .in('treino_id', treinoIds)
      .order('ordem');

    if (exerciciosError) {
      console.error('Erro ao carregar exercícios:', exerciciosError);
      return null;
    }

    // Organizar exercícios por mesociclo e treino
    const exercisesPerDay: Record<string, Record<string, any[]>> = {};

    mesociclos?.forEach(mesociclo => {
      const mesocicloKey = `mesociclo-${mesociclo.numero}`;
      exercisesPerDay[mesocicloKey] = {};

      const treinosMesociclo = treinos?.filter(t => t.mesociclo_id === mesociclo.id) || [];
      
      treinosMesociclo.forEach(treino => {
        const treinoKey = `day-${treino.ordem_semana}`;
        const exerciciosTreino = exercicios?.filter(e => e.treino_id === treino.id) || [];
        
        exercisesPerDay[mesocicloKey][treinoKey] = exerciciosTreino.map(exercicio => ({
          id: exercicio.id,
          name: exercicio.nome,
          muscleGroup: exercicio.grupo_muscular,
          series: exercicio.series,
          reps: exercicio.repeticoes,
          hidden: exercicio.oculto,
          originalId: exercicio.exercicio_original_id
        }));
      });
    });

    // Buscar cronogramas recomendados do primeiro mesociclo - FIX: handle both string[] and string[][]
    let savedSchedules: string[][] = [];
    if (mesociclos && mesociclos.length > 0 && mesociclos[0].cronogramas_recomendados) {
      const cronogramas = mesociclos[0].cronogramas_recomendados;
      // Check if it's already string[][] or if it's string[]
      if (Array.isArray(cronogramas) && cronogramas.length > 0) {
        if (Array.isArray(cronogramas[0])) {
          // It's already string[][]
          savedSchedules = cronogramas as string[][];
        } else {
          // It's string[], wrap it in an array
          savedSchedules = [cronogramas as string[]];
        }
      }
    }

    // Extrair durações dos mesociclos
    const mesocycleDurations = mesociclos?.map(m => m.duracao_semanas) || [];

    return {
      programName: programa.nome,
      programLevel: programa.nivel,
      weeklyFrequency: programa.frequencia_semanal,
      mesocycles: mesociclos?.length || 0,
      programData: {
        duration: `${programa.duracao_semanas} semanas`,
        goals: programa.objetivo,
        split: programa.split
      },
      exercisesPerDay,
      savedSchedules,
      mesocycleDurations
    };
  } catch (error) {
    console.error('Erro ao carregar programa para edição:', error);
    return null;
  }
};

export const loadProgramForEdit = async (programId: string) => {
  // Keep existing function for backward compatibility
  return loadExistingProgram(programId);
};
