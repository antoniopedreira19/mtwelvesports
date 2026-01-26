import { useState, useEffect } from "react";
import { Search, Plus, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ClientSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectClient: (client: Client) => void;
  onCreateNewClient: () => void;
}

export function ClientSelectorDialog({
  open,
  onOpenChange,
  onSelectClient,
  onCreateNewClient,
}: ClientSelectorDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setClients(data as Client[]);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-1 h-6 bg-[#E8BD27] rounded-full inline-block"></span>
            Selecionar Atleta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atleta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          {/* Lista de Clientes */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <User className="w-10 h-10 mb-2" />
                <p className="text-sm">Nenhum atleta encontrado</p>
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={client.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">
                        {client.name}
                      </p>
                      {client.nationality && (
                        <p className="text-sm text-muted-foreground truncate">
                          {client.nationality}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize shrink-0">
                      {client.stage}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Botão Criar Novo */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="outline"
              className="w-full"
              onClick={onCreateNewClient}
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Novo Atleta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
