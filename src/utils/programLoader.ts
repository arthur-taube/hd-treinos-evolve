
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
  weeklySchedules: string[][]; // Alias para compatibilidade
  mesocycleDurations: number[];
  dayTitles: Record<string, string>;
  rerPerWeekPerMesocycle?: Record<number, Record<number, string>>; // { mesocycleNum: { weekNum: rerValue } }
}

export const loadExistingProgram = async (programId: string): Promise<LoadedProgramData | null> => {
  try {
    console.log('📊 loadExistingProgram - Carregando programa:', programId);
    
    // Buscar programa
    const { data: programa, error: programaError } = await supabase
      .from('programas')
      .select('*')
      .eq('id', programId)
      .single();

    console.log('📊 Programa carregado:', programa);

    if (programaError || !programa) {
      console.error('❌ Erro ao carregar programa:', programaError);
      return null;
    }

    const isAdvanced = programa.nivel !== 'iniciante';

    // Buscar mesociclos
    const { data: mesociclos, error: mesociclosError } = await supabase
      .from('mesociclos')
      .select('*')
      .eq('programa_id', programId)
      .order('numero');

    console.log('📊 Mesociclos carregados:', mesociclos?.length || 0);

    if (mesociclosError) {
      console.error('❌ Erro ao carregar mesociclos:', mesociclosError);
      return null;
    }

    // Buscar treinos APENAS da semana 1 para o kanban
    const { data: treinos, error: treinosError } = await supabase
      .from('treinos')
      .select('*')
      .eq('programa_id', programId)
      .eq('ordem_semana', 1)
      .order('ordem_dia'); // Ordenar por ordem_dia

    console.log('📊 Treinos carregados (semana 1):', treinos?.length || 0);

    if (treinosError) {
      console.error('❌ Erro ao carregar treinos:', treinosError);
      return null;
    }

    // Buscar exercícios de todos os treinos
    const treinoIds = treinos?.map(t => t.id) || [];
    console.log('📊 Buscando exercícios para', treinoIds.length, 'treinos');
    
    let exercicios: any[] = [];

    if (isAdvanced) {
      // Buscar de exercicios_treino_avancado para programas avançados
      const { data, error } = await supabase
        .from('exercicios_treino_avancado')
        .select('*')
        .in('treino_id', treinoIds)
        .order('ordem');

      if (error) {
        console.error('❌ Erro ao carregar exercícios avançados:', error);
        return null;
      }
      exercicios = data || [];
    } else {
      const { data, error } = await supabase
        .from('exercicios_treino')
        .select('*')
        .in('treino_id', treinoIds)
        .order('ordem');

      if (error) {
        console.error('❌ Erro ao carregar exercícios:', error);
        return null;
      }
      exercicios = data || [];
    }

    console.log('📊 Exercícios carregados:', exercicios?.length || 0);

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

    // Carregar rer_por_semana dos mesociclos (para programas avançados)
    let rerPerWeekPerMesocycle: Record<number, Record<number, string>> | undefined;
    if (isAdvanced && mesociclos) {
      rerPerWeekPerMesocycle = {};
      mesociclos.forEach(m => {
        if (m.rer_por_semana && typeof m.rer_por_semana === 'object') {
          const parsed: Record<number, string> = {};
          Object.entries(m.rer_por_semana as Record<string, string>).forEach(([week, value]) => {
            parsed[Number(week)] = value;
          });
          rerPerWeekPerMesocycle![m.numero] = parsed;
        }
      });
    }

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
        ordem_dia: t.ordem_dia 
      })));
      
      treinosMesociclo.forEach((treino) => {
        // Usar ordem_dia como chave (day1, day2, etc.)
        const dayKey = `day${treino.ordem_dia}`;
        
        const exerciciosTreino = exercicios?.filter(e => e.treino_id === treino.id) || [];
        
        console.log(`Treino ${treino.nome} (${dayKey}) - Exercícios:`, exerciciosTreino.length);
        
        if (!exercisesPerDay[mesocicloKey][dayKey]) {
          exercisesPerDay[mesocicloKey][dayKey] = [];
        }
        
        const exerciciosFormatados = exerciciosTreino.map(exercicio => {
          const base = {
            id: exercicio.id,
            name: exercicio.nome,
            muscleGroup: exercicio.grupo_muscular,
            sets: exercicio.series,
            reps: exercicio.repeticoes,
            hidden: exercicio.oculto,
            originalId: exercicio.exercicio_original_id,
            allowMultipleGroups: exercicio.allow_multiple_groups || false,
            availableGroups: exercicio.available_groups || undefined
          };

          if (isAdvanced) {
            return {
              ...base,
              rer: exercicio.rer || 'do_microciclo',
              specialMethod: exercicio.metodo_especial || '',
              feedbackModel: exercicio.modelo_feedback || 'ARA/ART',
            };
          }

          return base;
        });
        
        exercisesPerDay[mesocicloKey][dayKey].push(...exerciciosFormatados);
      });
    });

    console.log('Exercícios organizados (apenas semana 1):', exercisesPerDay);

    // Extrair durações dos mesociclos
    const mesocycleDurations = mesociclos?.map(m => m.duracao_semanas) || [];

    // Criar dayTitles mapeando ordem_dia para título completo
    const dayTitles: Record<string, string> = {};
    const treinosFirstMeso = treinos?.filter(t => t.mesociclo_id === mesociclos[0]?.id) || [];
    
    console.log('📊 Treinos do primeiro mesociclo para dayTitles:', treinosFirstMeso);
    
    treinosFirstMeso.forEach(treino => {
      const dayKey = `day${treino.ordem_dia}`;
      const titulo = treino.nome_personalizado 
        ? `${treino.nome} - ${treino.nome_personalizado}`
        : treino.nome;
      dayTitles[dayKey] = titulo;
      console.log(`📊 Título configurado: ${dayKey} = ${titulo}`);
    });

    console.log('📊 dayTitles finais:', dayTitles);

    const resultado: LoadedProgramData = {
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
      weeklySchedules: savedSchedules, // Alias para compatibilidade
      mesocycleDurations,
      dayTitles,
      rerPerWeekPerMesocycle,
    };

    console.log('📊 Resultado final de loadExistingProgram:', {
      programName: resultado.programName,
      weeklyFrequency: resultado.weeklyFrequency,
      mesocycles: resultado.mesocycles,
      totalExercises: Object.values(exercisesPerDay).flatMap(day => Object.values(day)).flat().length,
      dayTitlesCount: Object.keys(dayTitles).length,
      mesocycleKeys: Object.keys(exercisesPerDay)
    });

    return resultado;
  } catch (error) {
    console.error('❌ Exception in loadExistingProgram:', error);
    return null;
  }
};

export const loadProgramForEdit = async (programId: string) => {
  // Keep existing function for backward compatibility
  return loadExistingProgram(programId);
};

/**
 * Carrega um programa do USUÁRIO (programas_usuario) para edição/customização
 * Diferente de loadExistingProgram que carrega de programas (templates)
 */
export const loadUserProgramForCustomize = async (programaUsuarioId: string): Promise<LoadedProgramData | null> => {
  try {
    console.log('📊 loadUserProgramForCustomize - Carregando programa do usuário:', programaUsuarioId);
    
    // 1. Buscar programa do usuário com programa original
    const { data: programaUsuario, error: programaError } = await supabase
      .from('programas_usuario')
      .select(`
        *,
        programa_original:programas(*)
      `)
      .eq('id', programaUsuarioId)
      .maybeSingle();

    if (programaError || !programaUsuario) {
      console.error('❌ Erro ao carregar programa do usuário:', programaError);
      return null;
    }

    const programaOriginal = programaUsuario.programa_original;
    const isAdvanced = programaOriginal.nivel !== 'iniciante';
    console.log('📊 Programa do usuário carregado:', programaUsuario.nome_personalizado || programaOriginal.nome);

    // 2. Buscar treinos do usuário (apenas semana 1 para o kanban)
    const { data: treinosUsuario, error: treinosError } = await supabase
      .from('treinos_usuario')
      .select('*')
      .eq('programa_usuario_id', programaUsuarioId)
      .eq('ordem_semana', 1)
      .order('ordem_dia');

    if (treinosError) {
      console.error('❌ Erro ao carregar treinos do usuário:', treinosError);
      return null;
    }

    console.log('📊 Treinos do usuário carregados (semana 1):', treinosUsuario?.length || 0);

    // 3. Buscar exercícios desses treinos
    const treinoIds = treinosUsuario?.map(t => t.id) || [];
    
    let exercicios: any[] = [];

    if (isAdvanced) {
      const { data, error } = await supabase
        .from('exercicios_treino_usuario_avancado' as any)
        .select('*')
        .in('treino_usuario_id', treinoIds)
        .eq('oculto', false)
        .order('ordem');

      if (error) {
        console.error('❌ Erro ao carregar exercícios avançados do usuário:', error);
        return null;
      }
      exercicios = data || [];
    } else {
      const { data, error } = await supabase
        .from('exercicios_treino_usuario')
        .select('*, card_original_id')
        .in('treino_usuario_id', treinoIds)
        .eq('oculto', false)
        .order('ordem');

      if (error) {
        console.error('❌ Erro ao carregar exercícios do usuário:', error);
        return null;
      }
      exercicios = data || [];
    }

    console.log('📊 Exercícios do usuário carregados:', exercicios?.length || 0);

    // 3.5. Buscar exercícios do template original para recuperar allow_multiple_groups/available_groups
    const treinoOriginalIds = [...new Set(treinosUsuario?.map(t => t.treino_original_id) || [])];
    const templateTable = isAdvanced ? 'exercicios_treino_avancado' : 'exercicios_treino';
    const { data: exerciciosOriginais } = await supabase
      .from(templateTable)
      .select('id, treino_id, exercicio_original_id, allow_multiple_groups, available_groups')
      .in('treino_id', treinoOriginalIds);

    console.log('📊 Exercícios originais do template carregados:', exerciciosOriginais?.length || 0);

    // 4. Calcular total de semanas e mesociclos
    const { data: allTreinos } = await supabase
      .from('treinos_usuario')
      .select('ordem_semana')
      .eq('programa_usuario_id', programaUsuarioId)
      .order('ordem_semana', { ascending: false })
      .limit(1);

    const totalWeeks = allTreinos?.[0]?.ordem_semana || programaOriginal.duracao_semanas;

    // 5. Organizar exercícios por dia
    const exercisesPerDay: Record<string, Record<string, any[]>> = {
      'mesocycle-1': {}
    };

    treinosUsuario?.forEach((treino) => {
      const dayKey = `day${treino.ordem_dia}`;
      const exerciciosTreino = exercicios?.filter(e => e.treino_usuario_id === treino.id) || [];
      
      exercisesPerDay['mesocycle-1'][dayKey] = exerciciosTreino.map(exercicio => {
        // Buscar dados do template original
        let exercicioTemplate = exercicio.card_original_id
          ? exerciciosOriginais?.find(eo => eo.id === exercicio.card_original_id)
          : exerciciosOriginais?.find(
              eo => eo.treino_id === treino.treino_original_id && 
                    eo.exercicio_original_id === exercicio.exercicio_original_id
            );

        const base = {
          id: exercicio.id,
          name: exercicio.nome,
          muscleGroup: exercicio.grupo_muscular,
          sets: exercicio.series,
          reps: exercicio.repeticoes,
          hidden: exercicio.oculto,
          originalId: exercicio.exercicio_original_id,
          allowMultipleGroups: exercicioTemplate?.allow_multiple_groups || false,
          availableGroups: exercicioTemplate?.available_groups || undefined,
          cardOriginalId: exercicio.card_original_id || null
        };

        if (isAdvanced) {
          return {
            ...base,
            rer: exercicio.rer || 'do_microciclo',
            specialMethod: exercicio.metodo_especial || '',
            feedbackModel: exercicio.modelo_feedback || 'ARA/ART',
          };
        }

        return base;
      });
    });

    // 6. Criar dayTitles
    const dayTitles: Record<string, string> = {};
    treinosUsuario?.forEach(treino => {
      const dayKey = `day${treino.ordem_dia}`;
      const titulo = treino.nome_personalizado 
        ? `${treino.nome} - ${treino.nome_personalizado}`
        : treino.nome;
      dayTitles[dayKey] = titulo;
    });

    // 7. Buscar cronogramas e rer_por_semana do programa original
    const { data: mesociclos } = await supabase
      .from('mesociclos')
      .select('numero, cronogramas_recomendados, duracao_semanas, rer_por_semana')
      .eq('programa_id', programaOriginal.id)
      .order('numero');

    let savedSchedules: string[][] = [];
    if (mesociclos && mesociclos.length > 0 && mesociclos[0].cronogramas_recomendados) {
      const cronogramas = mesociclos[0].cronogramas_recomendados;
      if (Array.isArray(cronogramas) && cronogramas.length > 0) {
        if (cronogramas.every(item => Array.isArray(item))) {
          savedSchedules = cronogramas as string[][];
        } else if (cronogramas.every(item => typeof item === 'string')) {
          savedSchedules = [cronogramas as string[]];
        }
      }
    }

    const mesocycleDurations = mesociclos?.map(m => m.duracao_semanas) || [totalWeeks];

    // Carregar rer_por_semana dos mesociclos
    let rerPerWeekPerMesocycle: Record<number, Record<number, string>> | undefined;
    if (isAdvanced && mesociclos) {
      rerPerWeekPerMesocycle = {};
      mesociclos.forEach(m => {
        if (m.rer_por_semana && typeof m.rer_por_semana === 'object') {
          const parsed: Record<number, string> = {};
          Object.entries(m.rer_por_semana as Record<string, string>).forEach(([week, value]) => {
            parsed[Number(week)] = value;
          });
          rerPerWeekPerMesocycle![m.numero] = parsed;
        }
      });
    }

    const resultado: LoadedProgramData = {
      programName: programaUsuario.nome_personalizado || programaOriginal.nome,
      programLevel: programaOriginal.nivel,
      weeklyFrequency: programaOriginal.frequencia_semanal,
      mesocycles: mesociclos?.length || 1,
      programData: {
        description: programaOriginal.descricao,
        duration: `${totalWeeks} semanas`,
        goals: programaOriginal.objetivo,
        split: programaOriginal.split
      },
      exercisesPerDay,
      savedSchedules,
      weeklySchedules: savedSchedules,
      mesocycleDurations,
      dayTitles,
      rerPerWeekPerMesocycle,
    };

    console.log('📊 Resultado final de loadUserProgramForCustomize:', {
      programName: resultado.programName,
      weeklyFrequency: resultado.weeklyFrequency,
      totalExercises: Object.values(exercisesPerDay['mesocycle-1']).flat().length,
      dayTitlesCount: Object.keys(dayTitles).length
    });

    return resultado;
  } catch (error) {
    console.error('❌ Exception in loadUserProgramForCustomize:', error);
    return null;
  }
};
