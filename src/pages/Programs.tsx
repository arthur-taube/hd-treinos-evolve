
import React from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import ProgramCard from "@/components/programs/ProgramCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Programs = () => {
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [hasActiveProgram, setHasActiveProgram] = useState(false);
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [pausedPrograms, setPausedPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Verificar se está logado e se é desenvolvedor
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check if user has admin role using the secure has_role function
          const { data: roleData } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
          setIsDeveloper(roleData === true);
          
          // Buscar programa ativo do usuário
          const { data: programaUsuarioAtivo, error: activeProgramError } = await supabase
            .from('programas_usuario')
            .select(`
              *,
              programa_original:programas(nome, descricao)
            `)
            .eq('usuario_id', user.id)
            .eq('ativo', true)
            .single();
            
          if (!activeProgramError && programaUsuarioAtivo) {
            setHasActiveProgram(true);
            setActiveProgram({
              id: programaUsuarioAtivo.id,
              name: programaUsuarioAtivo.nome_personalizado || programaUsuarioAtivo.programa_original.nome,
              description: `Programa base: ${programaUsuarioAtivo.programa_original.nome}`,
            });
          }
          
          // Buscar programas pausados do usuário
          const { data: programasUsuarioPausados } = await supabase
            .from('programas_usuario')
            .select(`
              *,
              programa_original:programas(nome, descricao)
            `)
            .eq('usuario_id', user.id)
            .eq('ativo', false);
            
          if (programasUsuarioPausados && programasUsuarioPausados.length > 0) {
            setPausedPrograms(programasUsuarioPausados.map(p => ({
              id: p.id,
              name: p.nome_personalizado || p.programa_original.nome,
              description: `Programa base: ${p.programa_original.nome}`
            })));
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handlePauseProgram = async (programaId: string) => {
    try {
      const { error } = await supabase
        .from('programas_usuario')
        .update({ ativo: false })
        .eq('id', programaId);
        
      if (error) throw error;
      
      // Atualizar UI
      setHasActiveProgram(false);
      setActiveProgram(null);
      
      if (activeProgram) {
        setPausedPrograms([...pausedPrograms, activeProgram]);
      }
    } catch (error) {
      console.error("Erro ao pausar programa:", error);
    }
  };
  
  const handleResumeProgram = async (programaId: string) => {
    try {
      // Desativar programa ativo atual, se houver
      if (hasActiveProgram) {
        await supabase
          .from('programas_usuario')
          .update({ ativo: false })
          .eq('id', activeProgram.id);
          
        if (activeProgram) {
          setPausedPrograms([...pausedPrograms, activeProgram]);
        }
      }
      
      // Ativar o programa selecionado
      const { error } = await supabase
        .from('programas_usuario')
        .update({ ativo: true })
        .eq('id', programaId);
        
      if (error) throw error;
      
      // Atualizar UI
      const programToActivate = pausedPrograms.find(p => p.id === programaId);
      if (programToActivate) {
        setHasActiveProgram(true);
        setActiveProgram(programToActivate);
        setPausedPrograms(pausedPrograms.filter(p => p.id !== programaId));
      }
    } catch (error) {
      console.error("Erro ao retomar programa:", error);
    }
  };

  const handleDeleteProgram = async (programaId: string, isPaused: boolean) => {
    try {
      const { error } = await supabase
        .from('programas_usuario')
        .delete()
        .eq('id', programaId);
        
      if (error) throw error;
      
      // Atualizar UI
      if (isPaused) {
        setPausedPrograms(pausedPrograms.filter(p => p.id !== programaId));
      } else {
        setHasActiveProgram(false);
        setActiveProgram(null);
      }
    } catch (error) {
      console.error("Erro ao excluir programa:", error);
    }
  };

  if (loading) {
    return (
      <div className="pb-20">
        <PageHeader title="Meus Programas" />
        <Button className="w-full mb-6 btn-primary" onClick={() => navigate("/program-catalog")}>
          Escolher um novo programa
        </Button>
        <div className="flex justify-center my-8">
          <p>Carregando seus programas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <PageHeader title="Meus Programas" />
      
      <Button className="w-full mb-6 btn-primary" onClick={() => navigate("/program-catalog")}>
        Escolher um novo programa
      </Button>

      <div className="space-y-6">
        <div>
          <h2 className="mb-4">Programa Ativo</h2>
          <ScrollArea className="h-auto">
            <div className="space-y-3">
              {hasActiveProgram && activeProgram ? (
                <div onClick={() => navigate("/active-program")} className="cursor-pointer">
                  <ProgramCard
                    key={activeProgram.id}
                    name={activeProgram.name}
                    description={activeProgram.description}
                    onPause={() => handlePauseProgram(activeProgram.id)}
                    onEdit={() => navigate(`/programs/edit/${activeProgram.id}`)}
                    onFinish={() => console.log("Finish program", activeProgram.id)}
                    onDelete={() => handleDeleteProgram(activeProgram.id, false)}
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Nenhum programa ativo no momento
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {pausedPrograms.length > 0 && (
          <div>
            <h2 className="mb-4">Programas Pausados</h2>
            <ScrollArea className="h-auto">
              <div className="space-y-3">
                {pausedPrograms.map((program) => (
                  <ProgramCard
                    key={program.id}
                    name={program.name}
                    description={program.description}
                    isPaused
                    onResume={() => handleResumeProgram(program.id)}
                    onEdit={() => navigate(`/programs/edit/${program.id}`)}
                    onFinish={() => console.log("Finish program", program.id)}
                    onDelete={() => handleDeleteProgram(program.id, true)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {isDeveloper && (
          <Button
            className="w-full mt-6"
            variant="outline"
            onClick={() => navigate("/programs/new")}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar novo programa
          </Button>
        )}
      </div>
    </div>
  );
};

export default Programs;
