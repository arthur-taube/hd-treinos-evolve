
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

export default function ProgramCatalog() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const selectProgram = async (program: Program) => {
    try {
      // Verificar se o usuário está logado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Usuário não logado",
          description: "Faça login para selecionar um programa de treino.",
          variant: "destructive"
        });
        return;
      }

      // Verificar se o usuário já tem este programa (ativo ou inativo)
      const { data: existingProgram } = await supabase
        .from('programas_usuario')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('programa_original_id', program.id)
        .single();

      if (existingProgram) {
        // Se o programa já existe mas não está ativo, reativá-lo
        if (!existingProgram.ativo) {
          await supabase
            .from('programas_usuario')
            .update({ 
              ativo: true,
              data_inicio: new Date().toISOString()
            })
            .eq('id', existingProgram.id);
          
          toast({
            title: "Programa reativado",
            description: `O programa "${program.nome}" foi reativado.`
          });
        } else {
          toast({
            title: "Programa já selecionado",
            description: `Você já está utilizando o programa "${program.nome}".`
          });
        }
        navigate('/active-program');
        return;
      }

      // Desativar qualquer programa ativo existente
      await supabase
        .from('programas_usuario')
        .update({ ativo: false })
        .eq('usuario_id', user.id)
        .eq('ativo', true);

      // Criar uma cópia do programa para o usuário
      const { data: programaUsuario, error } = await supabase
        .from('programas_usuario')
        .insert({
          programa_original_id: program.id,
          usuario_id: user.id,
          ativo: true
        })
        .select()
        .single();

      if (error) throw error;

      // Buscar todos os treinos do programa original
      const { data: treinosOriginais } = await supabase
        .from('treinos')
        .select('*')
        .eq('programa_id', program.id);

      if (treinosOriginais && treinosOriginais.length > 0) {
        // Para cada treino original, criar uma cópia para o usuário
        for (const treinoOriginal of treinosOriginais) {
          const { data: treinoUsuario, error: treinoError } = await supabase
            .from('treinos_usuario')
            .insert({
              programa_usuario_id: programaUsuario.id,
              treino_original_id: treinoOriginal.id,
              nome: treinoOriginal.nome,
              ordem_semana: treinoOriginal.ordem_semana
            })
            .select()
            .single();

          if (treinoError) throw treinoError;

          // Buscar exercícios do treino original
          const { data: exerciciosOriginais } = await supabase
            .from('exercicios_treino')
            .select('*')
            .eq('treino_id', treinoOriginal.id);

          if (exerciciosOriginais && exerciciosOriginais.length > 0) {
            // Para cada exercício, criar uma cópia para o usuário
            const exerciciosUsuario = exerciciosOriginais.map(exercicio => ({
              treino_usuario_id: treinoUsuario.id,
              exercicio_original_id: exercicio.id,
              nome: exercicio.nome,
              grupo_muscular: exercicio.grupo_muscular,
              series: exercicio.series,
              repeticoes: exercicio.repeticoes,
              oculto: exercicio.oculto,
              ordem: exercicio.ordem
            }));

            const { error: exerciciosError } = await supabase
              .from('exercicios_treino_usuario')
              .insert(exerciciosUsuario);

            if (exerciciosError) throw exerciciosError;
          }
        }
      }

      toast({
        title: "Programa selecionado",
        description: `O programa "${program.nome}" foi selecionado com sucesso.`
      });

      navigate('/active-program');
    } catch (error: any) {
      toast({
        title: "Erro ao selecionar programa",
        description: error.message || "Não foi possível selecionar o programa.",
        variant: "destructive"
      });
    }
  };

  const getLevelBadge = (level: string) => {
    switch(level) {
      case 'iniciante':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Iniciante</Badge>;
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
              
              <Button 
                onClick={() => selectProgram(program)} 
                className="w-full"
              >
                Selecionar Programa
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
