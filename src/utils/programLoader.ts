
import { supabase } from "@/integrations/supabase/client";
import type { Exercise } from "@/components/programs/ProgramEditor/types";

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
  exercisesPerDay: Record<string, Record<string, Exercise[]>>;
  savedSchedules: string[][];
  mesocycleDurations: number[];
}

export const loadExistingProgram = async (programId: string): Promise<LoadedProgramData | null> => {
  try {
    // 1. Carregar dados básicos do programa
    const { data: programa, error: programaError } = await supabase
      .from('programas')
      .select('*')
      .eq('id', programId)
      .single();

    if (programaError || !programa) {
      console.error('Erro ao carregar programa:', programaError);
      return null;
    }

    // 2. Carregar mesociclos com cronogramas recomendados
    const { data: mesociclos, error: mesociclosError } = await supabase
      .from('mesociclos')
      .select('numero, duracao_semanas, cronogramas_recomendados')
      .eq('programa_id', programId)
      .order('numero');

    if (mesociclosError) {
      console.error('Erro ao carregar mesociclos:', mesociclosError);
      return null;
    }

    // 3. Carregar treinos e exercícios
    const { data: treinos, error: treinosError } = await supabase
      .from('treinos')
      .select(`
        id,
        nome,
        dia_semana,
        mesociclo_id,
        exercicios_treino (
          id,
          nome,
          grupo_muscular,
          series,
          repeticoes,
          oculto,
          ordem,
          allow_multiple_groups,
          available_groups
        )
      `)
      .eq('programa_id', programId);

    if (treinosError) {
      console.error('Erro ao carregar treinos:', treinosError);
      return null;
    }

    // 4. Organizar dados
    const mesocycleDurations = mesociclos?.map(m => m.duracao_semanas) || [];
    const totalMesocycles = mesociclos?.length || 1;

    // Extrair cronogramas recomendados do primeiro mesociclo (todos devem ter os mesmos)
    const savedSchedules = mesociclos?.[0]?.cronogramas_recomendados || [];

    // Mapear exercícios por mesociclo e dia
    const exercisesPerDay: Record<string, Record<string, Exercise[]>> = {};

    // Agrupar treinos por mesociclo
    const treinosPorMesociclo: Record<string, any[]> = {};
    if (treinos) {
      treinos.forEach(treino => {
        const mesociclo = mesociclos?.find(m => m.numero === 
          mesociclos.findIndex(mes => mes.numero === 
            mesociclos.find(mc => mc.numero === 1)?.numero
          ) + 1
        );
        
        // Encontrar o número do mesociclo baseado no mesociclo_id
        const mesocicloNumero = mesociclos?.findIndex(m => {
          // Como não temos o ID direto, vamos assumir que os treinos seguem a ordem dos mesociclos
          return true; // Simplificar por enquanto
        }) + 1 || 1;

        const mesocicloKey = `mesocycle-${mesocicloNumero}`;
        
        if (!treinosPorMesociclo[mesocicloKey]) {
          treinosPorMesociclo[mesocicloKey] = [];
        }
        treinosPorMesociclo[mesocicloKey].push(treino);
      });
    }

    // Converter exercícios para o formato esperado
    Object.entries(treinosPorMesociclo).forEach(([mesocicloKey, treinos]) => {
      if (!exercisesPerDay[mesocicloKey]) {
        exercisesPerDay[mesocicloKey] = {};
      }

      treinos.forEach(treino => {
        const diaSemana = treino.dia_semana;
        if (!exercisesPerDay[mesocicloKey][diaSemana]) {
          exercisesPerDay[mesocicloKey][diaSemana] = [];
        }

        if (treino.exercicios_treino) {
          const exerciciosConvertidos = treino.exercicios_treino
            .sort((a: any, b: any) => a.ordem - b.ordem)
            .map((ex: any) => ({
              id: ex.id,
              name: ex.nome,
              muscleGroup: ex.grupo_muscular,
              sets: ex.series,
              reps: ex.repeticoes ? Number(ex.repeticoes) : undefined,
              hidden: ex.oculto,
              allowMultipleGroups: ex.allow_multiple_groups || false,
              availableGroups: ex.available_groups || undefined,
            }));

          exercisesPerDay[mesocicloKey][diaSemana].push(...exerciciosConvertidos);
        }
      });
    });

    return {
      programName: programa.nome,
      programLevel: programa.nivel,
      weeklyFrequency: programa.frequencia_semanal,
      mesocycles: totalMesocycles,
      programData: {
        duration: `${programa.duracao_semanas} semanas`,
        goals: programa.objetivo || [],
        split: programa.split,
      },
      exercisesPerDay,
      savedSchedules,
      mesocycleDurations,
    };

  } catch (error) {
    console.error('Erro ao carregar programa:', error);
    return null;
  }
};
