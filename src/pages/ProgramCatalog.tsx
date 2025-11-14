import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ProgramCatalogOptionsMenu from "@/components/programs/ProgramCatalogOptionsMenu";
import ProgramSelectionLoadingDialog from "@/components/programs/ProgramSelectionLoadingDialog";

interface Program {
  id: string;
  nome: string;
  descricao: string;
  nivel: string;
  frequencia_semanal: number;
  duracao_semanas: number;
  objetivo: string[];
  split: string;
}

// Developer user ID and email constants
const DEV_USER_ID = "a2eba955-7a98-42a6-ba49-1cf31dfad15d";
const DEV_USER_EMAIL = "arthurtaube.com.br@gmail.com";

export default function ProgramCatalog() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSelectingProgram, setIsSelectingProgram] = useState(false);
  const [selectedProgramName, setSelectedProgramName] = useState("");
  const { user } = useAuth();
  
  // Check if current user is the developer
  const isDeveloper = user?.id === DEV_USER_ID || user?.email === DEV_USER_EMAIL;
  
  useEffect(() => {
    async function fetchPrograms() {
      try {
        const { data, error } = await supabase
          .from('programas')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setPrograms(data || []);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar programas",
          description: error.message || "Não foi possível carregar os programas disponíveis.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchPrograms();
  }, []);

  const selectProgram = (program: Program) => {
    // Redirecionar para página de customização ao invés de copiar diretamente
    navigate(`/programs/customize/${program.id}`);
  };

  const handleEditProgram = (programId: string) => {
    // Navegar para a página de edição do programa
    navigate(`/programs/edit/${programId}`);
  };

  const handleDuplicateProgram = async (programId: string) => {
    try {
      // 1. Buscar o programa original
      const { data: originalProgram, error: programError } = await supabase
        .from('programas')
        .select('*')
        .eq('id', programId)
        .single();
        
      if (programError || !originalProgram) throw new Error("Programa não encontrado");
      
      // 2. Criar uma cópia do programa original
      const { data: newProgram, error: newProgramError } = await supabase
        .from('programas')
        .insert({
          ...originalProgram,
          nome: `${originalProgram.nome} (cópia)`,
          criado_por: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (newProgramError || !newProgram) throw newProgramError || new Error("Erro ao criar cópia do programa");
      
      // 3. Buscar todos os mesociclos do programa original
      const { data: originalMesocycles } = await supabase
        .from('mesociclos')
        .select('*')
        .eq('programa_id', programId);
        
      if (originalMesocycles && originalMesocycles.length > 0) {
        // Mapear IDs originais para novos IDs para referência cruzada
        const mesocyclesMap = new Map();
        
        // 4. Para cada mesociclo, criar uma cópia associada ao novo programa
        for (const mesociclo of originalMesocycles) {
          const { data: newMesocycle } = await supabase
            .from('mesociclos')
            .insert({
              programa_id: newProgram.id,
              numero: mesociclo.numero,
              duracao_semanas: mesociclo.duracao_semanas
            })
            .select()
            .single();
            
          if (newMesocycle) {
            mesocyclesMap.set(mesociclo.id, newMesocycle.id);
          }
        }
        
        // 5. Buscar todos os treinos do programa original
        const { data: originalWorkouts } = await supabase
          .from('treinos')
          .select('*')
          .eq('programa_id', programId);
          
        if (originalWorkouts && originalWorkouts.length > 0) {
          // 6. Para cada treino, criar uma cópia associada ao novo programa
          for (const treino of originalWorkouts) {
            // Obter o novo ID do mesociclo correspondente
            const newMesocicloId = mesocyclesMap.get(treino.mesociclo_id);
            if (!newMesocicloId) continue;
            
            const { data: newWorkout } = await supabase
              .from('treinos')
              .insert({
                programa_id: newProgram.id,
                mesociclo_id: newMesocicloId,
                nome: treino.nome,
                nome_personalizado: treino.nome_personalizado,
                ordem_dia: treino.ordem_dia,
                ordem_semana: treino.ordem_semana
              } as any)
              .select()
              .single();
              
            if (newWorkout) {
              // 7. Buscar exercícios do treino original
              const { data: originalExercises } = await supabase
                .from('exercicios_treino')
                .select('*')
                .eq('treino_id', treino.id);
                
              if (originalExercises && originalExercises.length > 0) {
                // 8. Para cada exercício, criar uma cópia associada ao novo treino
                const newExercises = originalExercises.map(exercicio => ({
                  treino_id: newWorkout.id,
                  nome: exercicio.nome,
                  grupo_muscular: exercicio.grupo_muscular,
                  series: exercicio.series,
                  repeticoes: exercicio.repeticoes,
                  oculto: exercicio.oculto,
                  ordem: exercicio.ordem,
                  exercicio_original_id: exercicio.exercicio_original_id
                }));
                
                await supabase
                  .from('exercicios_treino')
                  .insert(newExercises);
              }
            }
          }
        }
      }
      
      // Atualizar a lista de programas
      const { data } = await supabase
        .from('programas')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data) {
        setPrograms(data);
      }
      
      return true;
    } catch (error: any) {
      console.error('Erro ao duplicar programa:', error);
      throw error;
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      // Verificar se o programa está sendo usado por algum usuário
      const { data: usedPrograms, error: checkError } = await supabase
        .from('programas_usuario')
        .select('id')
        .eq('programa_original_id', programId)
        .limit(1);
        
      if (checkError) throw checkError;
      
      // Se o programa está sendo usado, apenas marca como oculto (implementação futura)
      if (usedPrograms && usedPrograms.length > 0) {
        // Por enquanto, apenas alertar e permitir a exclusão
        console.warn(`Programa ${programId} está sendo usado por usuários, mas será excluído mesmo assim.`);
      }
      
      // 1. Excluir exercícios dos treinos
      // Primeiro, obter todos os treinos do programa
      const { data: treinos } = await supabase
        .from('treinos')
        .select('id')
        .eq('programa_id', programId);
        
      if (treinos && treinos.length > 0) {
        const treinoIds = treinos.map(t => t.id);
        
        // Excluir os exercícios associados aos treinos
        await supabase
          .from('exercicios_treino')
          .delete()
          .in('treino_id', treinoIds);
      }
      
      // 2. Excluir os treinos
      await supabase
        .from('treinos')
        .delete()
        .eq('programa_id', programId);
        
      // 3. Excluir os mesociclos
      await supabase
        .from('mesociclos')
        .delete()
        .eq('programa_id', programId);
        
      // 4. Finalmente, excluir o programa
      const { error: deleteError } = await supabase
        .from('programas')
        .delete()
        .eq('id', programId);
        
      if (deleteError) throw deleteError;
      
      // Atualizar a lista de programas
      setPrograms(programs.filter(p => p.id !== programId));
      
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir programa:', error);
      throw error;
    }
  };

  const getLevelBadge = (level: string) => {
    switch(level) {
      case 'iniciante':
        return <Badge variant="outline" className="bg-green-600 text-white border-green-600">Iniciante</Badge>;
      case 'intermediario':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Intermediário</Badge>;
      case 'avancado':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Avançado</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="pb-20">
      <PageHeader title="Escolha um programa">
        <Button variant="outline" onClick={() => navigate("/programs")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </PageHeader>

      <ProgramSelectionLoadingDialog 
        open={isSelectingProgram}
        programName={selectedProgramName}
      />

      {loading ? (
        <div className="flex justify-center my-8">
          <p>Carregando programas disponíveis...</p>
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center my-8">
          <p className="text-muted-foreground">Nenhum programa disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {programs.map((program) => (
            <Card key={program.id} className="p-4 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-lg">{program.nome}</h3>
                {getLevelBadge(program.nivel)}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {program.descricao || `Programa de treino ${program.nivel}`}
              </p>
              
              <div className="text-sm space-y-1 mb-4 flex-grow">
                <div>
                  <span className="text-muted-foreground">Frequência:</span> {program.frequencia_semanal}x por semana
                </div>
                <div>
                  <span className="text-muted-foreground">Duração:</span> {program.duracao_semanas} semanas
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {program.objetivo.map((obj, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {obj}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <Button 
                  onClick={() => selectProgram(program)} 
                  className="flex-grow"
                >
                  Selecionar Programa
                </Button>
                
                {isDeveloper && (
                  <ProgramCatalogOptionsMenu
                    programId={program.id}
                    programName={program.nome}
                    onEdit={handleEditProgram}
                    onDuplicate={handleDuplicateProgram}
                    onDelete={handleDeleteProgram}
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
