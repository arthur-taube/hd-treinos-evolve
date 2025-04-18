
import ProgramStructureForm from "@/components/programs/ProgramEditor/ProgramStructureForm";
import PageHeader from "@/components/layout/PageHeader";

export default function ProgramEditor() {
  return (
    <div className="pb-20">
      <PageHeader title="Criar Novo Programa">
      </PageHeader>
      <ProgramStructureForm />
    </div>
  );
}
