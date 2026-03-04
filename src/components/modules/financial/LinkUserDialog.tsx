import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Link2, Unlink, UserCheck, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

interface LinkUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  currentUserId: string | null;
  onLinked: () => void;
}

export function LinkUserDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  currentUserId,
  onLinked,
}: LinkUserDialogProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Fetch users with role "client" from profiles + user_roles
  useEffect(() => {
    if (!open) return;
    fetchUsers();
    if (currentUserId) fetchCurrentUser();
  }, [open, currentUserId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, name, email");
      if (pErr) throw pErr;

      // Get all roles
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map<string, string>();
      for (const r of roles || []) {
        roleMap.set(r.user_id, r.role);
      }

      // Get clients that already have a user_id linked
      const { data: linkedClients } = await supabase
        .from("clients")
        .select("user_id")
        .not("user_id", "is", null);
      
      const linkedUserIds = new Set((linkedClients || []).map((c) => c.user_id).filter(Boolean));

      const mapped: UserProfile[] = (profiles || []).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: roleMap.get(p.id) || "member",
      }));

      // Filter: show client role users that aren't already linked (except current link)
      setUsers(
        mapped.filter((u) => {
          if (u.id === currentUserId) return false; // don't show current in the list
          if (linkedUserIds.has(u.id) && u.id !== currentUserId) return false; // already linked to another client
          return true;
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", currentUserId)
      .single();
    if (data) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUserId)
        .single();
      setCurrentUser({ ...data, role: roleData?.role || "member" });
    }
  };

  const linkUser = async (userId: string) => {
    setLinking(true);
    try {
      // Link client to user
      const { error } = await supabase
        .from("clients")
        .update({ user_id: userId })
        .eq("id", clientId);
      if (error) throw error;

      // Update profile name to match client name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: clientName })
        .eq("id", userId);
      if (profileError) console.error("Erro ao atualizar perfil:", profileError);

      toast.success("Usuário vinculado com sucesso!");
      onLinked();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao vincular usuário.");
    } finally {
      setLinking(false);
    }
  };

  const unlinkUser = async () => {
    setLinking(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ user_id: null })
        .eq("id", clientId);
      if (error) throw error;
      toast.success("Vínculo removido!");
      setCurrentUser(null);
      onLinked();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao remover vínculo.");
    } finally {
      setLinking(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.name?.toLowerCase().includes(q) || false) ||
      (u.email?.toLowerCase().includes(q) || false)
    );
  });

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return email?.charAt(0).toUpperCase() || "?";
  };

  const roleBadge = (role: string | null) => {
    const map: Record<string, { label: string; className: string }> = {
      admin: { label: "Admin", className: "bg-red-500/10 text-red-400 border-red-500/20" },
      member: { label: "Membro", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      client: { label: "Cliente", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    };
    const s = map[role || "member"] || map.member;
    return <Badge variant="outline" className={`${s.className} text-[10px] px-1.5 py-0`}>{s.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#141414] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#E8BD27]" />
            Vincular Usuário
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Associe um login do sistema ao cliente <span className="text-[#E8BD27] font-medium">{clientName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Current link */}
        {currentUser && (
          <div className="rounded-xl border border-[#E8BD27]/20 bg-[#E8BD27]/5 p-4">
            <p className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-[#E8BD27]" />
              Usuário vinculado atualmente
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-[#E8BD27]/20 text-[#E8BD27] text-sm font-semibold">
                    {getInitials(currentUser.name, currentUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">{currentUser.name || "Sem nome"}</p>
                  <p className="text-xs text-white/40">{currentUser.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={unlinkUser}
                disabled={linking}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs gap-1.5"
              >
                <Unlink className="h-3.5 w-3.5" />
                Desvincular
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        {/* User list */}
        <div className="max-h-[280px] overflow-y-auto space-y-1 -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <AlertCircle className="h-5 w-5 text-white/20" />
              <p className="text-sm text-white/30">
                {search ? "Nenhum usuário encontrado" : "Nenhum usuário disponível"}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => linkUser(user.id)}
                disabled={linking}
                className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-white/5 transition-all text-left group"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-white/10 text-white/60 text-sm font-medium group-hover:bg-[#E8BD27]/20 group-hover:text-[#E8BD27] transition-colors">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{user.name || "Sem nome"}</p>
                    {roleBadge(user.role)}
                  </div>
                  <p className="text-xs text-white/40 truncate">{user.email}</p>
                </div>
                <Link2 className="h-4 w-4 text-white/10 group-hover:text-[#E8BD27] transition-colors shrink-0" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
