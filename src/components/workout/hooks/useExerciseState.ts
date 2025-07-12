
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { updateMissingMuscleData, propagateIncrementoMinimo } from "@/utils/muscleDataLoader";
import { calculateProgression, getIncrementoMinimo, updateRepsProgramadas, getCurrentRepsProgramadas, roundSetsForDisplay } from "@/utils/progressionCalculator";
import { useExerciseFeedback } from "@/hooks/use-exercise-feedback";

export interface SetData {
  number: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

export interface SeriesData {
  date: string;
  weight: number;
  reps: number;
}

interface Exercise {
  id: string;
  nome: string;
  grupo_muscular: string;
  primary_muscle: string;
  secondary_muscle?: string;
  exercicio_original_id: string;
  series: number;
  repeticoes: string | null;
  peso: number | null;
  concluido: boolean;
  observacao?: string | null;
  video_url?: string | null;
  configuracao_inicial?: boolean;
  reps_programadas?: number | null;
}

export function useExerciseState(
  exercise: Exercise,
  onExerciseComplete: (exerciseId: string, isCompleted: boolean) => Promise<void>,
  onWeightUpdate: (exerciseId: string, weight: number) => Promise<void>
) {
  const [isOpen, setIsOpen] = useState(false);
  const [observation, setObservation] = useState(exercise.observacao || "");
  const [showObservationInput, setShowObservationInput] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [exerciseNote, setExerciseNote] = useState("");
  
  // Usar o número de séries arredondado para criar os sets no frontend
  const displaySets = roundSetsForDisplay(exercise.series);
  const [sets, setSets] = useState<SetData[]>(Array.from({
    length: displaySets
  }, (_, i) => ({
    number: i + 1,
    weight: exercise.peso || null,
    reps: exercise.repeticoes ? parseInt(exercise.repeticoes) : null,
    completed: false
  })));
  
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [previousSeries, setPreviousSeries] = useState<SeriesData[]>([]);

  const {
    showDifficultyDialog,
    setShowDifficultyDialog,
    showFatigueDialog,
    setShowFatigueDialog,
    showPainDialog,
    setShowPainDialog,
    showIncrementDialog,
    setShowIncrementDialog,
    saveDifficultyFeedback,
    saveFatigueFeedback,
    savePainFeedback,
    saveIncrementSetting,
    checkInitialConfiguration,
    checkNeedsPainEvaluation
  } = useExerciseFeedback(exercise.id);

  // Update muscle data when needed
  useEffect(() => {
    const updateMuscleDataIfNeeded = async () => {
      if ((!exercise.primary_muscle || !exercise.secondary_muscle) && exercise.exercicio_original_id) {
        const updated = await updateMissingMuscleData(exercise.id, exercise.exercicio_original_id);
        if (updated) {
          console.log('Dados musculares atualizados para o exercício:', exercise.nome);
        }
      }
    };
    updateMuscleDataIfNeeded();
  }, [exercise.id, exercise.exercicio_original_id, exercise.primary_muscle, exercise.secondary_muscle]);

  // Check if it's the first week
  const checkIsFirstWeek = async (): Promise<boolean> => {
    try {
      const currentRepsProgramadas = await getCurrentRepsProgramadas(exercise.id);
      return currentRepsProgramadas === null;
    } catch (error) {
      console.error('Erro ao verificar primeira semana:', error);
      return true;
    }
  };

  // Apply automatic progression
  const applyAutomaticProgression = async () => {
    if (isOpen && exercise.exercicio_original_id) {
      const isFirstWeek = await checkIsFirstWeek();
      if (isFirstWeek) {
        console.log('Primeira semana detectada - usando valores padrão');
        return;
      }

      try {
        const { data: avaliacoesAnteriores } = await supabase
          .from('exercicios_treino_usuario')
          .select('avaliacao_dificuldade, avaliacao_fadiga, avaliacao_dor, peso, series, repeticoes, incremento_minimo')
          .eq('exercicio_original_id', exercise.exercicio_original_id)
          .eq('concluido', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (avaliacoesAnteriores && avaliacoesAnteriores.length > 0) {
          const ultimaAvaliacao = avaliacoesAnteriores[0];

          let incrementoMinimo = ultimaAvaliacao.incremento_minimo;
          if (!incrementoMinimo && exercise.exercicio_original_id) {
            const { data: treinoUsuario } = await supabase
              .from('treinos_usuario')
              .select('programa_usuario_id')
              .eq('id', (await supabase
                .from('exercicios_treino_usuario')
                .select('treino_usuario_id')
                .eq('id', exercise.id)
                .single()).data?.treino_usuario_id || '')
              .single();
            
            if (treinoUsuario) {
              incrementoMinimo = await getIncrementoMinimo(exercise.exercicio_original_id, treinoUsuario.programa_usuario_id);
            }
          }

          const { data: seriesAnteriores } = await supabase.rpc('get_series_by_exercise', {
            exercise_id: exercise.id
          });
          
          let executedReps = 0;
          if (seriesAnteriores && seriesAnteriores.length > 0) {
            const bestSeries = seriesAnteriores.reduce((best, current) => {
              const bestVolume = best.peso * best.repeticoes;
              const currentVolume = current.peso * current.repeticoes;
              return currentVolume > bestVolume ? current : best;
            }, seriesAnteriores[0]);
            executedReps = bestSeries.repeticoes;
          }

          if (ultimaAvaliacao.avaliacao_dificuldade && incrementoMinimo && executedReps > 0) {
            const progressao = await calculateProgression({
              exerciseId: exercise.id,
              currentWeight: ultimaAvaliacao.peso || 0,
              programmedReps: ultimaAvaliacao.repeticoes || exercise.repeticoes || "10",
              executedReps: executedReps,
              currentSets: ultimaAvaliacao.series || exercise.series,
              incrementoMinimo: incrementoMinimo,
              avaliacaoDificuldade: ultimaAvaliacao.avaliacao_dificuldade,
              avaliacaoFadiga: ultimaAvaliacao.avaliacao_fadiga,
              avaliacaoDor: ultimaAvaliacao.avaliacao_dor,
              isFirstWeek: false
            });

            // Salvar valor exato de séries na database (com decimais)
            const { error: updateError } = await supabase
              .from('exercicios_treino_usuario')
              .update({ 
                series: progressao.newSets, // Valor exato com decimais
                peso: progressao.newWeight 
              })
              .eq('id', exercise.id);

            if (updateError) {
              console.error('Erro ao atualizar exercício:', updateError);
            } else {
              // Usar valor arredondado apenas para criar os sets no frontend
              const displaySets = roundSetsForDisplay(progressao.newSets);
              const targetReps = progressao.reps_programadas || (typeof progressao.newReps === 'string' ? parseInt(progressao.newReps.split('-')[0]) : Number(progressao.newReps));
              
              setSets(prevSets => Array.from({
                length: displaySets
              }, (_, i) => ({
                number: i + 1,
                weight: progressao.newWeight,
                reps: targetReps,
                completed: false
              })));

              if (progressao.newWeight !== exercise.peso) {
                onWeightUpdate(exercise.id, progressao.newWeight);
              }

              if (progressao.reps_programadas !== undefined) {
                await updateRepsProgramadas(exercise.id, progressao.reps_programadas);
              }
              
              console.log('Progressão aplicada:', {
                ...progressao,
                displaySets: displaySets,
                exactSets: progressao.newSets
              });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao aplicar progressão automática:', error);
      }
    }
  };

  // Initial configuration and progression logic
  useEffect(() => {
    if (isOpen) {
      if (exercise.configuracao_inicial === false) {
        checkInitialConfiguration();
      } else if (exercise.configuracao_inicial === true) {
        applyAutomaticProgression();
      }
    }
  }, [isOpen, exercise.configuracao_inicial, exercise.exercicio_original_id]);

  // Check for pain evaluation
  useEffect(() => {
    if (isOpen) {
      checkNeedsPainEvaluation(exercise.primary_muscle);
    }
  }, [isOpen, exercise.primary_muscle]);

  // Update sets when exercise.series changes (to handle progression updates)
  useEffect(() => {
    const displaySets = roundSetsForDisplay(exercise.series);
    if (sets.length !== displaySets) {
      setSets(Array.from({
        length: displaySets
      }, (_, i) => ({
        number: i + 1,
        weight: exercise.peso || null,
        reps: exercise.repeticoes ? parseInt(exercise.repeticoes) : null,
        completed: false
      })));
    }
  }, [exercise.series]);

  return {
    isOpen,
    setIsOpen,
    observation,
    setObservation,
    showObservationInput,
    setShowObservationInput,
    showNoteInput,
    setShowNoteInput,
    exerciseNote,
    setExerciseNote,
    sets,
    setSets,
    isLoadingSeries,
    setIsLoadingSeries,
    previousSeries,
    setPreviousSeries,
    showDifficultyDialog,
    setShowDifficultyDialog,
    showFatigueDialog,
    setShowFatigueDialog,
    showPainDialog,
    setShowPainDialog,
    showIncrementDialog,
    setShowIncrementDialog,
    saveDifficultyFeedback,
    saveFatigueFeedback,
    savePainFeedback,
    saveIncrementSetting,
    checkIsFirstWeek
  };
}
