import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Search, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PermissionsDialogProps {
  programId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserResult {
  id: string;
  email: string;
  full_name: string | null;
}

interface AllowedUser {
  id: string; // programa_permissoes row id
  user_id: string;
  email?: string;
  full_name?: string | null;
}

const PermissionsDialog = ({ programId, open, onOpenChange }: PermissionsDialogProps) => {
  const [isPrivate, setIsPrivate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load program privacy status and allowed users
  useEffect(() => {
    if (!open) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load program privacy status
        const { data: program } = await supabase
          .from("programas")
          .select("privado")
          .eq("id", programId)
          .single();

        if (program) {
          setIsPrivate(program.privado ?? false);
        }

        // Load allowed users with their info
        const { data: permissions } = await supabase
          .from("programa_permissoes")
          .select("id, user_id")
          .eq("programa_id", programId);

        if (permissions && permissions.length > 0) {
          // Fetch user details via the search function for each user
          const userIds = permissions.map((p) => p.user_id);
          const usersWithDetails: AllowedUser[] = [];

          for (const perm of permissions) {
            // Try to get user details from profiles
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", perm.user_id)
              .single();

            usersWithDetails.push({
              id: perm.id,
              user_id: perm.user_id,
              full_name: profile?.full_name || null,
            });
          }

          setAllowedUsers(usersWithDetails);
        } else {
          setAllowedUsers([]);
        }
      } catch (error) {
        console.error("Error loading permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, programId]);

  // Search users with debounce
  useEffect(() => {
    if (searchTerm.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.rpc("search_users_by_email_or_name", {
          search_term: searchTerm,
        });

        if (error) throw error;

        // Filter out already allowed users
        const allowedUserIds = new Set(allowedUsers.map((u) => u.user_id));
        const filtered = (data || []).filter((u: UserResult) => !allowedUserIds.has(u.id));
        setSearchResults(filtered);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, allowedUsers]);

  const handleTogglePrivate = async (checked: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("programas")
        .update({ privado: checked } as any)
        .eq("id", programId);

      if (error) throw error;
      setIsPrivate(checked);

      toast({
        title: checked ? "Programa marcado como privado" : "Programa marcado como público",
        description: checked
          ? "Apenas usuários permitidos poderão ver este programa."
          : "Todos os usuários poderão ver este programa.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (user: UserResult) => {
    try {
      const { data, error } = await supabase
        .from("programa_permissoes")
        .insert({ programa_id: programId, user_id: user.id } as any)
        .select("id, user_id")
        .single();

      if (error) throw error;

      setAllowedUsers((prev) => [
        ...prev,
        {
          id: data.id,
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
        },
      ]);
      setSearchTerm("");
      setSearchResults([]);

      toast({ title: "Usuário adicionado", description: `${user.email} agora pode ver este programa.` });
    } catch (error: any) {
      toast({ title: "Erro ao adicionar usuário", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveUser = async (permissionId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from("programa_permissoes")
        .delete()
        .eq("id", permissionId);

      if (error) throw error;

      setAllowedUsers((prev) => prev.filter((u) => u.id !== permissionId));
      toast({ title: "Usuário removido", description: `${userName} não poderá mais ver este programa.` });
    } catch (error: any) {
      toast({ title: "Erro ao remover usuário", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões</DialogTitle>
          <DialogDescription>
            Defina se o programa é público ou privado e gerencie os usuários com acesso.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Private toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="private-switch" className="font-medium">
                Programa Privado
              </Label>
              <Switch
                id="private-switch"
                checked={isPrivate}
                onCheckedChange={handleTogglePrivate}
                disabled={saving}
              />
            </div>

            {/* User management (only when private) */}
            {isPrivate && (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou e-mail (mín. 3 caracteres)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Search results */}
                {searching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Buscando...
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {user.full_name || "Sem nome"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddUser(user)}
                          className="ml-2 shrink-0"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Allowed users list */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Usuários com acesso ({allowedUsers.length})
                  </Label>
                  {allowedUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      Nenhum usuário adicionado. Apenas o administrador pode ver este programa.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {allowedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {user.full_name || user.email || user.user_id.slice(0, 8) + "..."}
                            </p>
                            {user.email && (
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleRemoveUser(user.id, user.full_name || user.email || "Usuário")
                            }
                            className="ml-2 shrink-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsDialog;
