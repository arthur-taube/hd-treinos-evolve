
import { supabase } from '@/integrations/supabase/client';

export interface LoadedProgramData {
  programName: string;
  programLevel: string;
  weeklyFrequency: number;
  mesocycles: number;
  programData: {
    description?: string;
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

    // Buscar treinos APENAS da semana 1 para o kanban
    const { data: treinos, error: treinosError } = await supabase
      .from('treinos')
      .select('*')
      .eq('programa_id', programId)
      .eq('ordem_semana', 1)
      .order('nome'); // Ordenar por nome para garantir ordem consistente (A, B, C, etc.)

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

    // Buscar cronogramas recomendados do primeiro mesociclo - CORRIGIDO
    let savedSchedules: string[][] = [];
    if (mesociclos && mesociclos.length > 0 && mesociclos[0].cronogramas_recomendados) {
      const cronogramas = mesociclos[0].cronogramas_recomendados;
      console.log('Cronogramas raw:', cronogramas);
      
      if (Array.isArray(cronogramas) && cronogramas.length > 0) {
        // Verificar se é array de arrays ou array simples - CORREÇÃO FINAL
        if (cronogramas.every(item => Array.isArray(item))) {
          // É array de arrays
          savedSchedules = cronogramas as string[][];
        } else if (cronogramas.every(item => typeof item === 'string')) {
          // É array simples de strings, converter para array de arrays
          savedSchedules = [cronogramas as string[]];
        } else {
          // Formato misto ou inválido, usar array vazio como fallback
          console.warn('Formato de cronogramas inválido:', cronogramas);
          savedSchedules = [];
        }
      }
    }

    console.log('Cronogramas processados:', savedSchedules);

    // Organizar exercícios por mesociclo e treino (apenas semana 1)
    const exercisesPerDay: Record<string, Record<string, any[]>> = {};

    mesociclos?.forEach(mesociclo => {
      const mesocicloKey = `mesocycle-${mesociclo.numero}`;
      exercisesPerDay[mesocicloKey] = {};

      // Filtrar treinos da semana 1 para este mesociclo
      const treinosMesociclo = treinos?.filter(t => t.mesociclo_id === mesociclo.id) || [];
      
      console.log(`Mesociclo ${mesociclo.numero} - Treinos encontrados:`, treinosMesociclo.map(t => ({ 
        id: t.id, 
        nome: t.nome, 
        dia_semana: t.dia_semana 
      })));
      
      treinosMesociclo.forEach((treino, index) => {
        // Usar dia_semana como chave (day1, day2, etc.)
        const dayKey = treino.dia_semana;
        
        const exerciciosTreino = exercicios?.filter(e => e.treino_id === treino.id) || [];
        
        console.log(`Treino ${treino.nome} (${dayKey}) - Exercícios:`, exerciciosTreino.length);
        
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
      });
    });

    console.log('Exercícios organizados (apenas semana 1):', exercisesPerDay);

    // Extrair durações dos mesociclos
    const mesocycleDurations = mesociclos?.map(m => m.duracao_semanas) || [];

    return {
      programName: programa.nome,
      programLevel: programa.nivel,
      weeklyFrequency: programa.frequencia_semanal,
      mesocycles: mesociclos?.length || 0,
      programData: {
        description: programa.descricao,
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
