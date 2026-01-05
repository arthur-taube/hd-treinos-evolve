
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
  const [finishedPrograms, setFinishedPrograms] = useState<any[]>([]);
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
          
          // Buscar programas pausados (ativo = false, finalizado = false)
          const { data: programasUsuarioPausados } = await supabase
            .from('programas_usuario')
            .select(`
              *,
              programa_original:programas(nome, descricao),
              treinos_usuario(id, concluido)
            `)
            .eq('usuario_id', user.id)
            .eq('ativo', false)
            .eq('finalizado', false);
            
          if (programasUsuarioPausados && programasUsuarioPausados.length > 0) {
            const paused = programasUsuarioPausados.map(p => ({
              id: p.id,
              name: p.nome_personalizado || p.programa_original.nome,
              description: `Programa base: ${p.programa_original.nome}`,
              hasUnfinishedWorkouts: p.treinos_usuario?.some((t: any) => !t.concluido) ?? false
            }));
            setPausedPrograms(paused);
          }
          
          // Buscar programas finalizados (finalizado = true)
          const { data: programasUsuarioFinalizados } = await supabase
            .from('programas_usuario')
            .select(`
              *,
              programa_original:programas(nome, descricao)
            `)
            .eq('usuario_id', user.id)
            .eq('finalizado', true);
            
          if (programasUsuarioFinalizados && programasUsuarioFinalizados.length > 0) {
            const finished = programasUsuarioFinalizados.map(p => ({
              id: p.id,
              name: p.nome_personalizado || p.programa_original.nome,
              description: `Programa base: ${p.programa_original.nome}`,
              dataFinalizado: p.data_finalizado
            }));
            setFinishedPrograms(finished);
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
        setFinishedPrograms(finishedPrograms.filter(p => p.id !== programaId));
      } else {
        setHasActiveProgram(false);
        setActiveProgram(null);
      }
    } catch (error) {
      console.error("Erro ao excluir programa:", error);
    }
  };

  const handleFinishProgram = async (programaId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('programas_usuario')
        .update({ 
          ativo: false,
          finalizado: true, 
          data_finalizado: new Date().toISOString() 
        })
        .eq('id', programaId);
        
      if (error) throw error;
      
      // Atualizar UI
      const programToFinish = isActive 
        ? activeProgram 
        : pausedPrograms.find(p => p.id === programaId);
        
      if (programToFinish) {
        setFinishedPrograms([...finishedPrograms, {
          ...programToFinish,
          dataFinalizado: new Date().toISOString()
        }]);
        
        if (isActive) {
          setHasActiveProgram(false);
          setActiveProgram(null);
        } else {
          setPausedPrograms(pausedPrograms.filter(p => p.id !== programaId));
        }
      }
    } catch (error) {
      console.error("Erro ao finalizar programa:", error);
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
                <ProgramCard
                  key={activeProgram.id}
                  name={activeProgram.name}
                  description={activeProgram.description}
                  onOpen={() => navigate("/active-program")}
                  onPause={() => handlePauseProgram(activeProgram.id)}
                  onEdit={() => navigate(`/programs/user/edit/${activeProgram.id}`)}
                  onFinish={() => handleFinishProgram(activeProgram.id, true)}
                  onDelete={() => handleDeleteProgram(activeProgram.id, false)}
                />
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
                    hasUnfinishedWorkouts={program.hasUnfinishedWorkouts}
                    onResume={() => handleResumeProgram(program.id)}
                    onFinish={() => handleFinishProgram(program.id, false)}
                    onDelete={() => handleDeleteProgram(program.id, true)}
                  />
                ))}
              </div>
          </ScrollArea>
          </div>
        )}

        {finishedPrograms.length > 0 && (
          <div>
            <h2 className="mb-4">Programas Finalizados</h2>
            <ScrollArea className="h-auto">
              <div className="space-y-3">
                {finishedPrograms.map((program) => (
                  <ProgramCard
                    key={program.id}
                    name={program.name}
                    description={program.description}
                    isFinished
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
