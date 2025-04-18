
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { CheckIcon, Save } from "lucide-react";

const ProfileForm = () => {
  // Personal profile data
  const [phoneNumber, setPhoneNumber] = useState("");
  const [trainingLevel, setTrainingLevel] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("");
  
  // Account data (read-only)
  const [fullName] = useState("Nome do Usuário");
  const [email] = useState("usuario@exemplo.com");
  const [birthDate] = useState("1990-01-01");
  
  // Security section
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Perfil atualizado com sucesso!");
  };
  
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Senha alterada com sucesso!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da Conta</CardTitle>
          <CardDescription>
            Informações básicas do seu perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo</label>
              <Input value={fullName} disabled className="bg-muted/50" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input value={email} disabled className="bg-muted/50" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Nascimento</label>
              <Input type="date" value={birthDate} disabled className="bg-muted/50" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <form onSubmit={handleProfileSubmit}>
          <CardHeader>
            <CardTitle>Perfil de Treinamento</CardTitle>
            <CardDescription>
              Informações que ajudarão a personalizar seu treino
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="text-sm font-medium">
                  WhatsApp
                </label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="trainingLevel" className="text-sm font-medium">
                  Nível de Treinamento
                </label>
                <Select value={trainingLevel} onValueChange={setTrainingLevel}>
                  <SelectTrigger className="input-field">
                    <SelectValue placeholder="Selecione seu nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="weight" className="text-sm font-medium">
                  Peso (kg)
                </label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="goal" className="text-sm font-medium">
                  Objetivo
                </label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="input-field">
                    <SelectValue placeholder="Selecione seu objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hypertrophy">Hipertrofia/Ganho de Massa</SelectItem>
                    <SelectItem value="definition">Definição/Perda de Gordura</SelectItem>
                    <SelectItem value="recomposition">Recomposição Corporal</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="btn-primary ml-auto">
              Salvar <Save size={18} className="ml-2" />
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <Card>
        <form onSubmit={handlePasswordSubmit}>
          <CardHeader>
            <CardTitle>Segurança da Conta</CardTitle>
            <CardDescription>
              Atualize sua senha ou gerencie opções avançadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="currentPassword" className="text-sm font-medium">
                  Senha Atual
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium">
                  Nova Senha
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Nova Senha
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <Separator className="my-4" />
              
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.")) {
                    toast.error("Funcionalidade de exclusão de conta será implementada em breve.");
                  }
                }}
              >
                Excluir Conta
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="btn-primary ml-auto"
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Alterar Senha <CheckIcon size={18} className="ml-2" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ProfileForm;
