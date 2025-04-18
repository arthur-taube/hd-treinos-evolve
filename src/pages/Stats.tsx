
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const Stats = () => {
  return (
    <div className="pb-20">
      <PageHeader title="Estatísticas" />

      <div className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart3 size={36} className="text-primary" />
          </div>
          <h2 className="text-xl font-medium">Em desenvolvimento</h2>
          <p className="text-muted-foreground max-w-sm">
            Estatísticas detalhadas do seu progresso serão adicionadas em breve.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="bg-card border border-border/40">
          <CardHeader>
            <CardTitle>Estatísticas Futuras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">• Número de treinos realizados</p>
            <p className="text-sm">• Recordes pessoais (PRs) em exercícios</p>
            <p className="text-sm">• Progresso de carga por exercício</p>
            <p className="text-sm">• Volume de treino semanal</p>
            <p className="text-sm">• Consistência de treino</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Stats;
