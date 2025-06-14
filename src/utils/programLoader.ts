
import { supabase } from "@/integrations/supabase/client";

export interface ProgramStructure {
  id: string;
  nome: string;
  descricao: string;
  semanas: number;
  dias_semana: number;
  treinos: WorkoutStructure[];
}

export interface WorkoutStructure {
  id: string;
  nome: string;
  dia_semana: number;
  exercicios: ExerciseStructure[];
}

export interface ExerciseStructure {
  id: string;
  nome: string;
  musculo_primario: string;
  musculos_secundarios: string[];
  series: string[];
  descanso: number;
  observacoes?: string;
}

export const copyProgramToUser = async (programId: string, userId: string) => {
  console.log("Iniciando cópia do programa:", programId, "para usuário:", userId);
  
  try {
    // 1. Buscar o programa original
    const { data: programa, error: programError } = await supabase
      .from('programas')
      .select('*')
      .eq('id', programId)
      .single();

    if (programError) throw programError;
    if (!programa) throw new Error('Programa não encontrado');

    console.log("Programa encontrado:", programa);

    // 2. Desativar programa ativo atual do usuário
    await supabase
      .from('programas_usuario')
      .update({ ativo: false })
      .eq('usuario_id', userId)
      .eq('ativo', true);

    // 3. Criar nova entrada em programas_usuario
    const { data: programaUsuario, error: programaUsuarioError } = await supabase
      .from('programas_usuario')
      .insert({
        usuario_id: userId,
        programa_id: programId,
        ativo: true
      })
      .select()
      .single();

    if (programaUsuarioError) throw programaUsuarioError;
    
    console.log("Programa do usuário criado:", programaUsuario);

    // 4. Buscar treinos do programa original
    const { data: treinosOriginais, error: treinosError } = await supabase
      .from('treinos')
      .select('*')
      .eq('programa_id', programId)
      .order('dia_semana');

    if (treinosError) throw treinosError;
    
    console.log("Treinos originais encontrados:", treinosOriginais);

    // 5. Copiar treinos para o usuário
    for (const treinoOriginal of treinosOriginais) {
      const { data: treinoUsuario, error: treinoError } = await supabase
        .from('treinos_usuario')
        .insert({
          programa_usuario_id: programaUsuario.id,
          treino_original_id: treinoOriginal.id,
          nome: treinoOriginal.nome,
          dia_semana: treinoOriginal.dia_semana,
          semana_atual: 1,
          concluido: false
        })
        .select()
        .single();

      if (treinoError) throw treinoError;
      
      console.log("Treino do usuário criado:", treinoUsuario);

      // 6. Buscar exercícios do treino original
      const { data: exerciciosOriginais, error: exerciciosError } = await supabase
        .from('exercicios')
        .select('*')
        .eq('treino_id', treinoOriginal.id)
        .order('ordem');

      if (exerciciosError) throw exerciciosError;
      
      console.log("Exercícios originais encontrados:", exerciciosOriginais);

      // 7. Copiar exercícios para o usuário
      for (const exercicioOriginal of exerciciosOriginais) {
        // Parse the series data correctly
        let seriesParsed: string[][];
        try {
          if (typeof exercicioOriginal.series === 'string') {
            seriesParsed = JSON.parse(exercicioOriginal.series);
          } else if (Array.isArray(exercicioOriginal.series)) {
            // Check if it's already a 2D array
            if (exercicioOriginal.series.length > 0 && Array.isArray(exercicioOriginal.series[0])) {
              seriesParsed = exercicioOriginal.series as string[][];
            } else {
              // Convert 1D array to 2D array format
              seriesParsed = (exercicioOriginal.series as string[]).map(serie => [serie]);
            }
          } else {
            seriesParsed = [['8-12']]; // default fallback
          }
        } catch (error) {
          console.error("Erro ao fazer parse das séries:", error);
          seriesParsed = [['8-12']]; // default fallback
        }

        const { data: exercicioUsuario, error: exercicioError } = await supabase
          .from('exercicios_usuario')
          .insert({
            treino_usuario_id: treinoUsuario.id,
            exercicio_original_id: exercicioOriginal.id,
            nome: exercicioOriginal.nome,
            musculo_primario: exercicioOriginal.musculo_primario,
            musculos_secundarios: exercicioOriginal.musculos_secundarios,
            series: seriesParsed,
            descanso: exercicioOriginal.descanso,
            observacoes: exercicioOriginal.observacoes,
            ordem: exercicioOriginal.ordem,
            concluido: false
          })
          .select()
          .single();

        if (exercicioError) throw exercicioError;
        
        console.log("Exercício do usuário criado:", exercicioUsuario);
      }
    }

    console.log("Programa copiado com sucesso!");
    return programaUsuario;
    
  } catch (error) {
    console.error("Erro ao copiar programa:", error);
    throw error;
  }
};
