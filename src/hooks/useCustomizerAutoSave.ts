import { useEffect } from "react";

interface CustomizerState {
  customProgramName: string;
  cronogramaConfig: any;
  customExercises: Record<string, any[]>;
  customDayTitles: Record<string, string>;
  startDate: Date;
}

export function useCustomizerAutoSave(
  programId: string,
  state: CustomizerState,
  isLoading: boolean
) {
  const STORAGE_KEY = `program_customizer_${programId}`;

  // Salvar no sessionStorage a cada mudança
  useEffect(() => {
    if (!isLoading) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          customProgramName: state.customProgramName,
          cronogramaConfig: state.cronogramaConfig,
          customExercises: state.customExercises,
          customDayTitles: state.customDayTitles,
          startDate: state.startDate,
        })
      );
    }
  }, [state, isLoading, STORAGE_KEY]);

  // Limpar cache ao salvar com sucesso
  const clearCache = () => {
    sessionStorage.removeItem(STORAGE_KEY);
  };

  // Recuperar cache ao montar componente
  const loadCache = (): CustomizerState | null => {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Converter string de data de volta para Date
        if (parsed.startDate) {
          parsed.startDate = new Date(parsed.startDate);
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  };

  return { clearCache, loadCache };
}
