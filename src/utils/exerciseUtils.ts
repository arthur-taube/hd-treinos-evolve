
import { supabase } from "@/integrations/supabase/client";

export const findExerciseByName = async (exerciseName: string) => {
  try {
    const { data, error } = await supabase
      .from('exercicios_iniciantes')
      .select('id, nome, grupo_muscular')
      .eq('nome', exerciseName)
      .single();
    
    if (error) {
      console.error('Error finding exercise by name:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception while finding exercise:', error);
    return null;
  }
};
