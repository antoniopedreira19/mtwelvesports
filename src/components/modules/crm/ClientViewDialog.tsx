import { useState } from "react";
import { User, Mail, Phone, MapPin, FileText, Pencil, Trash2, Calendar, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Client, PipelineStage } from "@/types";
import { capitalizeWords } from "@/lib/utils";

interface ClientViewDialogProps {
  client: Client | null;
  contractValue?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: (clientId: string) => Promise<void>;
}

const stageLabels: Record<PipelineStage, string> = {
  radar: "Leads",
  contato: "SQL",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

const stageBadgeColors: Record<PipelineStage, string> = {
  radar: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contato: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  negociacao: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  fechado: "bg-green-500/20 text-green-400 border-green-500/30",
  perdido: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function ClientViewDialog({
  client,
  contractValue,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ClientViewDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!client) return;
    setIsDeleting(true);
    try {
      await onDelete(client.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!client) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-card border-border">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {capitalizeWords(client.name)}
              </DialogTitle>
              <Badge className={stageBadgeColors[client.stage]} variant="outline">
                {stageLabels[client.stage]}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Button>
        </DialogHeader>

        <Separator className="my-2" />

        <div className="space-y-4">
          {/* Contract Value for Fechado */}
          {client.stage === "fechado" && contractValue && (
            <div className="p-4 rounded-lg bg-success/10 border border-success/30">
              <div className="flex items-center gap-2 text-success mb-1">
                <span className="text-sm font-medium">Valor do Contrato</span>
              </div>
              <span className="text-2xl font-bold text-success">
                {formatCurrency(contractValue)}
              </span>
            </div>
          )}

          {/* Lost Reason for Perdido */}
          {client.stage === "perdido" && client.lost_reason && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Motivo da Perda</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {client.lost_reason}
              </p>
            </div>
          )}

          {/* Meeting Info for Negociação */}
          {client.stage === "negociacao" && (client.meeting_date || client.meeting_responsible) && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-2 text-warning mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Reunião Agendada</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {client.meeting_date && (
                  <div>
                    <span className="text-muted-foreground">Data: </span>
                    <span>{format(new Date(client.meeting_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                )}
                {client.meeting_responsible && (
                  <div>
                    <span className="text-muted-foreground">Responsável: </span>
                    <span>{client.meeting_responsible}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            {client.nationality && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{capitalizeWords(client.nationality)}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>Observações</span>
              </div>
              <p className="text-sm p-3 rounded-lg bg-muted/30">
                {client.notes}
              </p>
            </div>
          )}
        </div>

        <Separator className="my-2" />

        <div className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Remover
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover lead?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O lead será permanentemente removido do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
