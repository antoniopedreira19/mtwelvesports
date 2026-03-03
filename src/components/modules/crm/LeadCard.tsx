import { Phone, Mail, MapPin, DollarSign, MoreHorizontal, FileText, Calendar, StickyNote } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LeadCardProps {
  client: Client;
  columnId: PipelineStage;
  contractValue?: number;
  isDragging?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const stageAccent: Record<PipelineStage, string> = {
  radar: "from-blue-500/20 to-transparent",
  contato: "from-yellow-500/20 to-transparent",
  negociacao: "from-orange-500/20 to-transparent",
  fechado: "from-green-500/20 to-transparent",
  perdido: "from-red-500/20 to-transparent",
};

const stageGlow: Record<PipelineStage, string> = {
  radar: "hover:shadow-blue-500/5",
  contato: "hover:shadow-yellow-500/5",
  negociacao: "hover:shadow-orange-500/5",
  fechado: "hover:shadow-green-500/5",
  perdido: "hover:shadow-red-500/5",
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
  const hasNotes = !!client.notes;
  const hasNextStepNotes = !!(client as any).next_step_notes;
  const hasMeeting = !!(client.meeting_date && columnId === "negociacao");

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-3.5 mb-2 rounded-xl border border-border/40 transition-all duration-200 cursor-pointer",
        "bg-gradient-to-b from-card to-card/80",
        "hover:border-border/70 hover:shadow-lg",
        stageGlow[columnId],
        isDragging && "shadow-2xl shadow-black/40 scale-[1.02] border-border/60 z-50"
      )}
    >
      {/* Subtle top accent gradient */}
      <div className={cn("absolute inset-x-0 top-0 h-[2px] rounded-t-xl bg-gradient-to-r opacity-60", stageAccent[columnId])} />

      {/* Header: Name + Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">
            {capitalizeWords(client.name)}
          </p>
          {client.nationality && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{capitalizeWords(client.nationality)}</span>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Contact info */}
      {(client.phone || client.email) && (
        <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
          {client.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[90px]">{client.phone}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[90px]">{client.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Notes preview */}
      {hasNotes && (
        <div className="mt-2.5 p-2 rounded-lg bg-muted/30 border border-border/20">
          <div className="flex items-start gap-1.5">
            <StickyNote className="w-3 h-3 shrink-0 text-muted-foreground mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
              {client.notes}
            </p>
          </div>
        </div>
      )}

      {/* Meeting badge for negociação */}
      {hasMeeting && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-orange-400">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>
            {format(new Date(client.meeting_date!), "dd MMM", { locale: ptBR })}
            {client.meeting_responsible && (
              <span className="text-muted-foreground"> · {client.meeting_responsible}</span>
            )}
          </span>
        </div>
      )}

      {/* Contract value for closed clients */}
      {columnId === "fechado" && contractValue && (
        <div className="mt-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
          <DollarSign className="w-3 h-3 text-green-400 shrink-0" />
          <span className="text-xs font-semibold text-green-400">
            {formatCurrency(contractValue)}
          </span>
        </div>
      )}

      {/* Lost reason for perdido */}
      {columnId === "perdido" && client.lost_reason && (
        <div className="mt-2.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-[11px] text-red-400 line-clamp-1">
            {client.lost_reason}
          </p>
        </div>
      )}

      {/* Bottom icons row */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1.5 mt-2.5">
          {hasNextStepNotes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-5 h-5 rounded flex items-center justify-center bg-purple-500/10">
                  <FileText className="w-3 h-3 text-purple-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">{(client as any).next_step_notes}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
