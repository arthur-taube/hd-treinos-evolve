import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  titulo_id?: string | null;
}

interface Titulo {
  id: string;
  nome: string;
  descricao: string | null;
  image_url: string | null;
}

interface TitleGroup {
  titulo: Titulo;
  programs: Program[];
  levels: string[];
  frequencies: number[];
  objectives: string[];
}

const DEV_USER_ID = "a2eba955-7a98-42a6-ba49-1cf31dfad15d";
const DEV_USER_EMAIL = "arthurtaube.com.br@gmail.com";

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

export default function ProgramCatalog() {
  const navigate = useNavigate();
  const [titleGroups, setTitleGroups] = useState<TitleGroup[]>([]);
  const [ungroupedPrograms, setUngroupedPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [isSelectingProgram, setIsSelectingProgram] = useState(false);
  const [selectedProgramName, setSelectedProgramName] = useState("");
  const { user } = useAuth();

  const isDeveloper = user?.id === DEV_USER_ID || user?.email === DEV_USER_EMAIL;

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: titulos, error: titulosError }, { data: programas, error: programasError }] = await Promise.all([
          supabase.from("titulos_programa").select("*").order("nome"),
          supabase.from("programas").select("*").order("created_at", { ascending: false }),
        ]);

        if (titulosError) throw titulosError;
        if (programasError) throw programasError;

        const titulosMap = new Map<string, Titulo>();
        (titulos || []).forEach((t: any) => titulosMap.set(t.id, t));

        const grouped = new Map<string, Program[]>();
        const ungrouped: Program[] = [];

        (programas || []).forEach((p: any) => {
          if (p.titulo_id && titulosMap.has(p.titulo_id)) {
            if (!grouped.has(p.titulo_id)) grouped.set(p.titulo_id, []);
            grouped.get(p.titulo_id)!.push(p);
          } else {
            ungrouped.push(p);
          }
        });

        const groups: TitleGroup[] = [];
        grouped.forEach((programs, tituloId) => {
          const titulo = titulosMap.get(tituloId)!;
          const levels = [...new Set(programs.map((p) => p.nivel))];
          const frequencies = [...new Set(programs.map((p) => p.frequencia_semanal))].sort((a, b) => a - b);
          const objectives = [...new Set(programs.flatMap((p) => p.objetivo))];
          groups.push({ titulo, programs, levels, frequencies, objectives });
        });

        groups.sort((a, b) => a.titulo.nome.localeCompare(b.titulo.nome));
        setTitleGroups(groups);
        setUngroupedPrograms(ungrouped);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar programas",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleDescription = (id: string) => {
    setExpandedDescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fallback handlers for ungrouped programs (same as before)
  const selectProgram = (program: Program) => {
    navigate(`/programs/customize/${program.id}`);
  };

  const handleEditProgram = (programId: string) => {
    navigate(`/programs/edit/${programId}`);
  };

  const handleDuplicateProgram = async (programId: string) => {
    try {
      const { data: originalProgram, error: programError } = await supabase
        .from("programas").select("*").eq("id", programId).single();
      if (programError || !originalProgram) throw new Error("Programa não encontrado");

      const { data: newProgram, error: newProgramError } = await supabase
        .from("programas")
        .insert({ ...originalProgram, nome: `${originalProgram.nome} (cópia)`, criado_por: user?.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select().single();
      if (newProgramError || !newProgram) throw newProgramError || new Error("Erro ao criar cópia");

      const { data: originalMesocycles } = await supabase.from("mesociclos").select("*").eq("programa_id", programId);
      if (originalMesocycles?.length) {
        const mesocyclesMap = new Map();
        for (const m of originalMesocycles) {
          const { data: nm } = await supabase.from("mesociclos").insert({ programa_id: newProgram.id, numero: m.numero, duracao_semanas: m.duracao_semanas }).select().single();
          if (nm) mesocyclesMap.set(m.id, nm.id);
        }
        const { data: originalWorkouts } = await supabase.from("treinos").select("*").eq("programa_id", programId);
        if (originalWorkouts?.length) {
          for (const t of originalWorkouts) {
            const newMesocicloId = mesocyclesMap.get(t.mesociclo_id);
            if (!newMesocicloId) continue;
            const { data: nw } = await supabase.from("treinos").insert({ programa_id: newProgram.id, mesociclo_id: newMesocicloId, nome: t.nome, nome_personalizado: t.nome_personalizado, ordem_dia: t.ordem_dia, ordem_semana: t.ordem_semana } as any).select().single();
            if (nw) {
              const { data: oe } = await supabase.from("exercicios_treino").select("*").eq("treino_id", t.id);
              if (oe?.length) {
                await supabase.from("exercicios_treino").insert(oe.map((e) => ({ treino_id: nw.id, nome: e.nome, grupo_muscular: e.grupo_muscular, series: e.series, repeticoes: e.repeticoes, oculto: e.oculto, ordem: e.ordem, exercicio_original_id: e.exercicio_original_id })));
              }
            }
          }
        }
      }
      // Reload
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
      setUngroupedPrograms((prev) => prev.filter((p) => p.id !== programId));
      return true;
    } catch (error: any) {
      console.error("Erro ao excluir programa:", error);
      throw error;
    }
  };

  return (
    <div className="pb-20">
      <PageHeader title="Escolha um Programa">
        <Button variant="outline" onClick={() => navigate("/programs")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </PageHeader>

      <ProgramSelectionLoadingDialog open={isSelectingProgram} programName={selectedProgramName} />

      {loading ? (
        <div className="flex justify-center my-8">
          <p>Carregando programas disponíveis...</p>
        </div>
      ) : titleGroups.length === 0 && ungroupedPrograms.length === 0 ? (
        <div className="text-center my-8">
          <p className="text-muted-foreground">Nenhum programa disponível no momento.</p>
        </div>
      ) : (
        <div className="space-y-4 mt-6">
          {/* Title cards */}
          {titleGroups.map((group) => {
            const isExpanded = expandedDescriptions.has(group.titulo.id);
            return (
              <Card key={group.titulo.id} className="overflow-hidden">
                {/* Header: title + level badges */}
                <div className="flex justify-between items-start p-4 pb-0">
                  <h3 className="font-semibold text-lg">{group.titulo.nome}</h3>
                  <div className="flex gap-1 flex-shrink-0">
                    {group.levels.map((level) => (
                      <span key={level}>{getLevelBadge(level)}</span>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 pt-3 flex gap-4">
                  {group.titulo.image_url && (
                    <img
                      src={group.titulo.image_url}
                      alt={group.titulo.nome}
                      className="w-24 h-24 object-cover rounded-md flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {group.objectives.map((obj, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{obj}</Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Frequências:</span>{" "}
                      {group.frequencies.map((f) => `${f}x`).join(", ")} por semana
                    </p>
                    {group.titulo.descricao && (
                      <div>
                        <p className={`text-sm text-muted-foreground ${!isExpanded ? "line-clamp-2" : ""}`}>
                          {group.titulo.descricao}
                        </p>
                        {group.titulo.descricao.length > 120 && (
                          <button
                            onClick={() => toggleDescription(group.titulo.id)}
                            className="text-xs text-primary flex items-center gap-0.5 mt-1"
                          >
                            {isExpanded ? (
                              <>ver menos <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>ver mais <ChevronDown className="h-3 w-3" /></>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 pb-4">
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/program-catalog/${group.titulo.id}`)}
                  >
                    Ver Planos de Treino
                  </Button>
                </div>
              </Card>
            );
          })}

          {/* Ungrouped programs (fallback - same as old layout) */}
          {ungroupedPrograms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ungroupedPrograms.map((program) => (
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
      )}
    </div>
  );
}
