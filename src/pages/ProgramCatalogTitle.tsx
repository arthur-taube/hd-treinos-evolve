import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";
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
  privado?: boolean;
}

const DEV_USER_ID = "a2eba955-7a98-42a6-ba49-1cf31dfad15d";
const DEV_USER_EMAIL = "arthurtaube.com.br@gmail.com";

export default function ProgramCatalogTitle() {
  const { tituloId } = useParams<{ tituloId: string }>();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [tituloNome, setTituloNome] = useState("");
  const [tituloDescricao, setTituloDescricao] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSelectingProgram, setIsSelectingProgram] = useState(false);
  const [selectedProgramName, setSelectedProgramName] = useState("");
  const { user } = useAuth();

  const isDeveloper = user?.id === DEV_USER_ID || user?.email === DEV_USER_EMAIL;

  useEffect(() => {
    async function fetchData() {
      if (!tituloId) return;
      try {
        const [{ data: titulo, error: tituloError }, { data: programas, error: programasError }] = await Promise.all([
          supabase.from("titulos_programa").select("*").eq("id", tituloId).single(),
          supabase.from("programas").select("*").eq("titulo_id", tituloId).order("frequencia_semanal"),
        ]);

        if (tituloError) throw tituloError;
        if (programasError) throw programasError;

        setTituloNome(titulo?.nome || "");
        setTituloDescricao(titulo?.descricao || null);
        setPrograms(programas || []);
      } catch (error: any) {
        toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tituloId]);

  const selectProgram = (program: Program) => {
    navigate(`/programs/customize/${program.id}`);
  };

  const handleEditProgram = (programId: string) => {
    navigate(`/programs/edit/${programId}`);
  };

  const handleDuplicateProgram = async (programId: string) => {
    try {
      const { data: orig, error } = await supabase.from("programas").select("*").eq("id", programId).single();
      if (error || !orig) throw new Error("Programa não encontrado");

      const { data: np, error: npErr } = await supabase
        .from("programas")
        .insert({ ...orig, nome: `${orig.nome} (cópia)`, criado_por: user?.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select().single();
      if (npErr || !np) throw npErr || new Error("Erro ao duplicar");

      const { data: mesos } = await supabase.from("mesociclos").select("*").eq("programa_id", programId);
      if (mesos?.length) {
        const mm = new Map();
        for (const m of mesos) {
          const { data: nm } = await supabase.from("mesociclos").insert({ programa_id: np.id, numero: m.numero, duracao_semanas: m.duracao_semanas }).select().single();
          if (nm) mm.set(m.id, nm.id);
        }
        const { data: treinos } = await supabase.from("treinos").select("*").eq("programa_id", programId);
        if (treinos?.length) {
          for (const t of treinos) {
            const nmi = mm.get(t.mesociclo_id);
            if (!nmi) continue;
            const { data: nt } = await supabase.from("treinos").insert({ programa_id: np.id, mesociclo_id: nmi, nome: t.nome, nome_personalizado: t.nome_personalizado, ordem_dia: t.ordem_dia, ordem_semana: t.ordem_semana } as any).select().single();
            if (nt) {
              const { data: exs } = await supabase.from("exercicios_treino").select("*").eq("treino_id", t.id);
              if (exs?.length) {
                await supabase.from("exercicios_treino").insert(exs.map((e) => ({ treino_id: nt.id, nome: e.nome, grupo_muscular: e.grupo_muscular, series: e.series, repeticoes: e.repeticoes, oculto: e.oculto, ordem: e.ordem, exercicio_original_id: e.exercicio_original_id })));
              }
            }
          }
        }
      }
      window.location.reload();
      return true;
    } catch (error: any) {
      console.error("Erro ao duplicar programa:", error);
      throw error;
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      const { data: treinos } = await supabase.from("treinos").select("id").eq("programa_id", programId);
      if (treinos?.length) {
        await supabase.from("exercicios_treino").delete().in("treino_id", treinos.map((t) => t.id));
      }
      await supabase.from("treinos").delete().eq("programa_id", programId);
      await supabase.from("mesociclos").delete().eq("programa_id", programId);
      const { error } = await supabase.from("programas").delete().eq("id", programId);
      if (error) throw error;
      setPrograms((prev) => prev.filter((p) => p.id !== programId));
      return true;
    } catch (error: any) {
      console.error("Erro ao excluir programa:", error);
      throw error;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "iniciante":
        return <Badge variant="outline" className="bg-green-600 text-white border-green-600">Iniciante</Badge>;
      case "intermediario":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Intermediário</Badge>;
      case "avancado":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Avançado</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="pb-20">
      <PageHeader title={tituloNome || "Planos de Treino"}>
        <Button variant="outline" onClick={() => navigate("/program-catalog")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </PageHeader>

      {tituloDescricao && (
        <div className="mb-6 -mt-2">
          <p className={`text-sm text-muted-foreground ${!descExpanded ? "line-clamp-3" : ""}`}>
            {tituloDescricao}
          </p>
          {tituloDescricao.length > 150 && (
            <button
              onClick={() => setDescExpanded(!descExpanded)}
              className="text-xs text-primary flex items-center gap-0.5 mt-1"
            >
              {descExpanded ? <>ver menos <ChevronUp className="h-3 w-3" /></> : <>ver mais <ChevronDown className="h-3 w-3" /></>}
            </button>
          )}
        </div>
      )}

      <ProgramSelectionLoadingDialog open={isSelectingProgram} programName={selectedProgramName} />

      {loading ? (
        <div className="flex justify-center my-8"><p>Carregando programas...</p></div>
      ) : programs.length === 0 ? (
        <div className="text-center my-8"><p className="text-muted-foreground">Nenhum programa encontrado neste título.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Card key={program.id} className="p-4 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-lg">{program.nome}</h3>
                  {isDeveloper && program.privado && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Privado</Badge>
                  )}
                </div>
                {getLevelBadge(program.nivel)}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {program.descricao || `Programa de treino ${program.nivel}`}
              </p>
              <div className="text-sm space-y-1 mb-4 flex-grow">
                <div><span className="text-muted-foreground">Frequência:</span> {program.frequencia_semanal}x por semana</div>
                <div><span className="text-muted-foreground">Duração:</span> {program.duracao_semanas} semanas</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {program.objetivo.map((obj, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">{obj}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <Button onClick={() => selectProgram(program)} className="flex-grow">Selecionar Programa</Button>
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
