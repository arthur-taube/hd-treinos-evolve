import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompletedProgram {
  id: string;
  nome: string;
  dataFinalizacao: string;
  detalhes: string;
}

export function useHistoryData() {
  const [completedPrograms, setCompletedPrograms] = useState<CompletedProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedPrograms();
  }, []);

  const fetchCompletedPrograms = async () => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      const { data } = await supabase
        .from('programas_usuario')
        .select(`
          id,
          updated_at,
          programas!inner(
            nome,
            duracao_semanas
          )
        `)
        .eq('usuario_id', userId)
        .eq('ativo', false);

      if (data) {
        const formattedPrograms = data.map(program => ({
          id: program.id,
          nome: program.programas.nome,
          dataFinalizacao: new Date(program.updated_at).toLocaleDateString('pt-BR'),
          detalhes: `Programa de ${program.programas.duracao_semanas} semanas finalizado`
        }));
        
        setCompletedPrograms(formattedPrograms);
      }
    } catch (error) {
      console.error('Error fetching completed programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (programId: string) => {
    try {
      const { error } = await supabase
        .from('programas_usuario')
        .delete()
        .eq('id', programId);

      if (error) throw error;

      setCompletedPrograms(prev => prev.filter(p => p.id !== programId));
      toast.success('Programa removido do histórico');
    } catch (error) {
      console.error('Error deleting program:', error);
      toast.error('Erro ao remover programa');
    }
  };

  const handleRestart = async (programId: string) => {
    try {
      const { error } = await supabase
        .from('programas_usuario')
        .update({ ativo: true, progresso: 0 })
        .eq('id', programId);

      if (error) throw error;

      const program = completedPrograms.find(p => p.id === programId);
      if (program) {
        toast.success(`O programa ${program.nome} foi reiniciado`);
        setCompletedPrograms(prev => prev.filter(p => p.id !== programId));
      }
    } catch (error) {
      console.error('Error restarting program:', error);
      toast.error('Erro ao reiniciar programa');
    }
  };

  const handleViewDetails = (programId: string) => {
    const program = completedPrograms.find(p => p.id === programId);
    if (program) {
      toast.info(`Detalhes: ${program.detalhes}`);
    }
  };

  return {
    completedPrograms,
    loading,
    handleDelete,
    handleRestart,
    handleViewDetails
  };
}