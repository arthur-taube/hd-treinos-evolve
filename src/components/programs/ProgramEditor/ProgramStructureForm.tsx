
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  name: z.string().min(1, "Nome do programa é obrigatório"),
  level: z.enum(["iniciante", "intermediario", "avancado"]),
  mesocycles: z.number().min(1, "Mínimo de 1 mesociclo"),
  duration: z.string().min(1, "Duração é obrigatória"),
  goals: z.array(z.string()).min(1, "Selecione pelo menos um objetivo"),
  weeklyFrequency: z.number().min(1, "Mínimo de 1 dia por semana"),
  split: z.string().min(1, "Selecione uma divisão de treino"),
});

const goals = [
  { id: "hipertrofia", label: "Hipertrofia" },
  { id: "definicao", label: "Definição" },
  { id: "recomposicao", label: "Recomposição" },
  { id: "manutencao", label: "Manutenção" },
  { id: "priorizacao", label: "Priorização" },
  { id: "especializacao", label: "Especialização" },
];

const splits = [
  { id: "full_body", label: "Full Body" },
  { id: "upper_lower", label: "Upper/Lower" },
  { id: "push_pull", label: "Push/Pull" },
  { id: "upper_lower_full", label: "Upper/Lower/Full" },
  { id: "ppl", label: "Push/Pull/Legs" },
  { id: "ppl_ul", label: "Push/Pull/Legs/Upper/Lower" },
  { id: "split", label: "Split" },
];

import ProgramExercisesForm from "./ProgramExercisesForm";

export default function ProgramStructureForm() {
  const navigate = useNavigate();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showPhase2, setShowPhase2] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      level: "iniciante",
      mesocycles: 1,
      duration: "",
      goals: [],
      weeklyFrequency: 3,
      split: "",
    },
  });
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log(values);
    setShowPhase2(true);
  };

  const handleBack = () => {
    if (form.formState.isDirty) {
      setShowExitDialog(true);
    } else {
      navigate("/programs");
    }
  };

  if (showPhase2) {
    return (
      <div className="space-y-6">
        <ProgramExercisesForm 
          programName={form.getValues().name}
          programLevel={form.getValues().level}
          weeklyFrequency={form.getValues().weeklyFrequency}
          mesocycles={form.getValues().mesocycles}
          programData={{
            duration: form.getValues().duration,
            goals: form.getValues().goals,
            split: form.getValues().split,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Programa</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Hipertrofia Avançada" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mesocycles"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mesociclos</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duração</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 12 semanas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="goals"
            render={() => (
              <FormItem>
                <FormLabel>Objetivos</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  {goals.map((goal) => (
                    <FormField
                      key={goal.id}
                      control={form.control}
                      name="goals"
                      render={({ field }) => (
                        <FormItem
                          key={goal.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(goal.id)}
                              onCheckedChange={(checked) => {
                                const values = checked
                                  ? [...field.value, goal.id]
                                  : field.value?.filter((value) => value !== goal.id);
                                field.onChange(values);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {goal.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weeklyFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequência Semanal</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="split"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Divisão do Treino</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a divisão" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {splits.map((split) => (
                      <SelectItem key={split.id} value={split.id}>
                        {split.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-6">
            <Button type="button" variant="outline" onClick={handleBack}>
              Voltar
            </Button>
            <Button type="submit">Continuar</Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Se sair agora, todas as alterações serão perdidas. Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowExitDialog(false);
                navigate("/programs");
              }}
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
