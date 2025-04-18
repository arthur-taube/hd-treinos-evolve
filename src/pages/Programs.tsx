import React from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import ProgramCard from "@/components/programs/ProgramCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Programs = () => {
  const [isDeveloper, setIsDeveloper] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsDeveloper(user?.email === "arthurtaube.com.br@gmail.com");
    };

    checkUserRole();
  }, []);

  // Mock user email for development
  const userEmail = "usuario@exemplo.com";
  const developerEmail = "arthurtaube.com.br@gmail.com";

  const activePrograms = [
    {
      id: 1,
      name: "Hipertrofia Avançada",
      description: "Treino de 4 dias focado em hipertrofia muscular",
    },
  ];

  const pausedPrograms = [
    {
      id: 2,
      name: "Força Total",
      description: "Programa de 3 dias para ganho de força",
    },
    {
      id: 3,
      name: "Split Clássico",
      description: "Treino dividido por grupos musculares",
    },
  ];

  return (
    <div className="pb-20">
      <PageHeader title="Meus Programas">
        <Button className="btn-primary">
          Escolher um programa
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <div>
          <h2 className="mb-4">Programa Ativo</h2>
          <ScrollArea className="h-auto">
            <div className="space-y-3">
              {activePrograms.length > 0 ? (
                activePrograms.map((program) => (
                  <ProgramCard
                    key={program.id}
                    name={program.name}
                    description={program.description}
                    onPause={() => console.log("Pause program", program.id)}
                    onEdit={() => console.log("Edit program", program.id)}
                    onFinish={() => console.log("Finish program", program.id)}
                    onDelete={() => console.log("Delete program", program.id)}
                  />
                ))
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
                    onResume={() => console.log("Resume program", program.id)}
                    onEdit={() => console.log("Edit program", program.id)}
                    onFinish={() => console.log("Finish program", program.id)}
                    onDelete={() => console.log("Delete program", program.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {isDeveloper && (
          <Button className="w-full mt-6 btn-outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar novo programa
          </Button>
        )}
      </div>
    </div>
  );
};

export default Programs;
