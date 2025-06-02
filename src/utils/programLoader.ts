
import { supabase } from '@/integrations/supabase/client';

export const loadProgramForEdit = async (programId: string) => {
  try {
    // Buscar programa
    const { data: programa, error: programaError } = await supabase
      .from('programas')
      .select('*')
      .eq('id', programId)
      .single();

    if (programaError) throw programaError;

    // Buscar mesociclos
    const { data: mesociclos, error: mesociclosError } = await supabase
      .from('mesociclos')
      .select('*')
      .eq('programa_id', programId)
      .order('numero');

    if (mesociclosError) throw mesociclosError;

    // Buscar treinos
    const { data: treinos, error: treinosError } = await supabase
      .from('treinos')
      .select('*')
      .eq('programa_id', programId)
      .order('mesociclo_id, ordem_semana, dia_semana');

    if (treinosError) throw treinosError;

    // Buscar exercícios dos treinos
    const treinoIds = treinos.map(t => t.id);
    const { data: exercicios, error: exerciciosError } = await supabase
      .from('exercicios_treino')
      .select('*')
      .in('treino_id', treinoIds)
      .order('ordem');

    if (exerciciosError) throw exerciciosError;

    // Organizar exercícios por treino
    const exerciciosPorTreino: Record<string, any[]> = {};
    exercicios.forEach(ex => {
      if (!exerciciosPorTreino[ex.treino_id]) {
        exerciciosPorTreino[ex.treino_id] = [];
      }
      exerciciosPorTreino[ex.treino_id].push(ex);
    });

    // Organizar treinos por mesociclo e dia
    const exercisesPerDay: Record<string, Record<string, any[]>> = {};
    
    mesociclos.forEach(mesociclo => {
      const mesocycleKey = `mesocycle-${mesociclo.numero}`;
      exercisesPerDay[mesocycleKey] = {};
      
      // Agrupar treinos deste mesociclo por dia da semana
      const treinosMesociclo = treinos.filter(t => t.mesociclo_id === mesociclo.id);
      
      treinosMesociclo.forEach(treino => {
        const diaSemana = treino.dia_semana;
        if (!exercisesPerDay[mesocycleKey][diaSemana]) {
          exercisesPerDay[mesocycleKey][diaSemana] = [];
        }
        
        const exerciciosDoTreino = exerciciosPorTreino[treino.id] || [];
        exercisesPerDay[mesocycleKey][diaSemana].push(...exerciciosDoTreino.map(ex => ({
          id: ex.id,
          name: ex.nome,
          muscleGroup: ex.grupo_muscular,
          sets: ex.series,
          reps: ex.repeticoes,
          hidden: ex.oculto,
          allowMultipleGroups: ex.allow_multiple_groups,
          availableGroups: ex.available_groups
        })));
      });
    });

    // Buscar cronogramas recomendados do primeiro mesociclo
    const savedSchedules: string[][] = mesociclos.length > 0 && mesociclos[0].cronogramas_recomendados 
      ? mesociclos[0].cronogramas_recomendados 
      : [];

    // Extrair durações dos mesociclos
    const mesocycleDurations = mesociclos.map(m => m.duracao_semanas);

    return {
      programData: {
        id: programa.id,
        nome: programa.nome,
        nivel: programa.nivel,
        frequencia_semanal: programa.frequencia_semanal,
        mesociclos: mesociclos.length,
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
    throw error;
  }
};
