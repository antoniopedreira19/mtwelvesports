import { Phone, Mail, MapPin, DollarSign, MoreHorizontal, Calendar, MessageSquareText, Footprints } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { capitalizeWords } from "@/lib/utils";
import { Client, PipelineStage } from "@/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LeadCardProps {
  client: Client;
  columnId: PipelineStage;
  contractValue?: number;
  isDragging?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const stageBorder: Record<PipelineStage, string> = {
  radar: "border-l-blue-500",
  next_step: "border-l-purple-500",
  contato: "border-l-yellow-500",
  negociacao: "border-l-orange-500",
  fechado: "border-l-green-500",
  perdido: "border-l-red-500",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function LeadCard({
  client,
  columnId,
  contractValue,
  isDragging,
  onClick,
  onEdit,
  onDelete,
}: LeadCardProps) {
  const isClosedOrLost = columnId === "fechado" || columnId === "perdido";
  const hasNotes = !!client.notes && !isClosedOrLost;
  const hasNextStepNotes = !!client.next_step_notes && !isClosedOrLost;
  const hasMeeting = !!(client.meeting_date && columnId === "negociacao");

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative mb-2.5 rounded-lg border border-border/50 border-l-[3px] transition-all duration-200 cursor-pointer",
        "bg-card hover:bg-accent/30",
        stageBorder[columnId],
        isDragging && "shadow-xl shadow-black/30 scale-[1.01] z-50 ring-1 ring-primary/20"
      )}
    >
      {/* Main content */}
      <div className="p-3">
        {/* Header: Name + Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[13px] leading-tight truncate text-foreground">
              {capitalizeWords(client.name)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 -mr-1"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={onClick}>Ver detalhes</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta row: nationality + contact */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
          {client.nationality && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{capitalizeWords(client.nationality)}</span>
            </span>
          )}
          {client.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[80px]">{client.phone}</span>
            </span>
          )}
          {client.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[80px]">{client.email}</span>
            </span>
          )}
        </div>

        {/* Notes section */}
        {hasNotes && (
          <div className="mt-2.5 space-y-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Observações</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
              {client.notes}
            </p>
          </div>
        )}

        {/* Next step notes section */}
        {hasNextStepNotes && (
          <div className="mt-2 space-y-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400/80">Próximos Passos</span>
            <p className="text-[11px] text-purple-300/90 leading-relaxed line-clamp-2">
              {client.next_step_notes}
            </p>
          </div>
        )}

        {/* Meeting badge */}
        {hasMeeting && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-orange-500/10 text-orange-400">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>
              {format(new Date(client.meeting_date!), "dd MMM yyyy", { locale: ptBR })}
              {client.meeting_responsible && (
                <span className="text-muted-foreground"> · {client.meeting_responsible}</span>
              )}
            </span>
          </div>
        )}

        {/* Contract value */}
        {columnId === "fechado" && contractValue && (
          <div className="mt-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
            <DollarSign className="w-3 h-3 text-green-400 shrink-0" />
            <span className="text-xs font-semibold text-green-400">
              {formatCurrency(contractValue)}
            </span>
          </div>
        )}

        {/* Lost reason */}
        {columnId === "perdido" && client.lost_reason && (
          <div className="mt-2.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
            <p className="text-[11px] text-red-400 line-clamp-1">
              {client.lost_reason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
