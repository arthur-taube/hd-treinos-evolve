
import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import ProgramStructureForm from "@/components/programs/ProgramEditor/ProgramStructureForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProgramEditor() {
  const navigate = useNavigate();
  
  return (
    <div className="pb-20">
      <PageHeader title="Criar Novo Programa">
        <Button variant="outline" onClick={() => navigate("/programs")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </PageHeader>
      <ProgramStructureForm />
    </div>
  );
}
