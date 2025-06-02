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

    // Buscar cronogramas recomendados do primeiro mesociclo
    let savedSchedules: string[][] = [];
    if (mesociclos && mesociclos.length > 0 && mesociclos[0].cronogramas_recomendados) {
      const cronogramas = mesociclos[0].cronogramas_recomendados;
      if (Array.isArray(cronogramas) && cronogramas.length > 0) {
        if (Array.isArray(cronogramas[0])) {
          savedSchedules = cronogramas as string[][];
        } else {
          savedSchedules = [cronogramas as string[]];
        }
      }
    }

    console.log('Cronogramas carregados:', savedSchedules);

    // Organizar exercícios por mesociclo e treino
    const exercisesPerDay: Record<string, Record<string, any[]>> = {};

    mesociclos?.forEach(mesociclo => {
      const mesocicloKey = `mesocycle-${mesociclo.numero}`;
      exercisesPerDay[mesocicloKey] = {};

      const treinosMesociclo = treinos?.filter(t => t.mesociclo_id === mesociclo.id) || [];
      
      // Obter o cronograma para este mesociclo (usar o primeiro cronograma como padrão)
      const cronogramaMesociclo = savedSchedules.length > 0 ? savedSchedules[0] : [];
      
      treinosMesociclo.forEach(treino => {
        // Encontrar o índice do dia da semana no cronograma
        const dayIndex = cronogramaMesociclo.findIndex(day => day === treino.dia_semana);
        
        if (dayIndex !== -1) {
          // Usar o dia real do cronograma como chave
          const dayKey = treino.dia_semana;
          const exerciciosTreino = exercicios?.filter(e => e.treino_id === treino.id) || [];
          
          if (!exercisesPerDay[mesocicloKey][dayKey]) {
            exercisesPerDay[mesocicloKey][dayKey] = [];
          }
          
          const exerciciosFormatados = exerciciosTreino.map(exercicio => ({
            id: exercicio.id,
            name: exercicio.nome,
            muscleGroup: exercicio.grupo_muscular,
            sets: exercicio.series,
            reps: exercicio.repeticoes,
            hidden: exercicio.oculto,
            originalId: exercicio.exercicio_original_id,
            allowMultipleGroups: exercicio.allow_multiple_groups || false,
            availableGroups: exercicio.available_groups || undefined
          }));
          
          exercisesPerDay[mesocicloKey][dayKey].push(...exerciciosFormatados);
        }
      });
    });

    console.log('Exercícios organizados:', exercisesPerDay);

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
