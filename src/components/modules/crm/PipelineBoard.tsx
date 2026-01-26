import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PipelineColumn, Client, PipelineStage } from "@/types";
import { cn } from "@/lib/utils";
import { User, Phone, Mail, MoreHorizontal, MapPin, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRealtimeClients } from "@/hooks/useRealtimeClients";
import { ClientDetailDialog } from "./ClientDetailDialog";

interface PipelineBoardProps {
  onClientMoveToFechado: (client: Client) => void;
  searchTerm?: string;
  nationalityFilter?: string;
}

const columnColors: Record<PipelineStage, string> = {
  radar: "border-t-blue-500",
  contato: "border-t-yellow-500",
  negociacao: "border-t-orange-500",
  fechado: "border-t-green-500",
  perdido: "border-t-red-500",
};

const columnBadgeColors: Record<PipelineStage, string> = {
  radar: "bg-blue-500/10 text-blue-400",
  contato: "bg-yellow-500/10 text-yellow-400",
  negociacao: "bg-orange-500/10 text-orange-400",
  fechado: "bg-green-500/10 text-green-400",
  perdido: "bg-red-500/10 text-red-400",
};

export function PipelineBoard({ onClientMoveToFechado, searchTerm = "", nationalityFilter = "" }: PipelineBoardProps) {
  const { columns, setColumns, updateClientStage, updateClient, deleteClient } = useRealtimeClients();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId);
    const destColumn = columns.find((col) => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const sourceClients = [...sourceColumn.clients];
    const [movedClient] = sourceClients.splice(source.index, 1);

    const updatedClient: Client = {
      ...movedClient,
      stage: destination.droppableId as PipelineStage,
      updated_at: new Date().toISOString(),
    };

    // Optimistic UI update
    if (source.droppableId === destination.droppableId) {
      sourceClients.splice(destination.index, 0, updatedClient);
      setColumns(columns.map((col) => (col.id === source.droppableId ? { ...col, clients: sourceClients } : col)));
    } else {
      const destClients = [...destColumn.clients];
      destClients.splice(destination.index, 0, updatedClient);

      setColumns(
        columns.map((col) => {
          if (col.id === source.droppableId) {
            return { ...col, clients: sourceClients };
          }
          if (col.id === destination.droppableId) {
            return { ...col, clients: destClients };
          }
          return col;
        }),
      );

      // Persist to Supabase
      try {
        await updateClientStage(movedClient.id, destination.droppableId as PipelineStage);

        if (destination.droppableId === "fechado") {
          onClientMoveToFechado(updatedClient);
        }
      } catch (error) {
        toast.error("Erro ao salvar mudança de status");
      }
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const filteredClients = column.clients.filter((client) => {
              const matchesName = client.name.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesNation = nationalityFilter
                ? client.nationality?.toLowerCase().includes(nationalityFilter.toLowerCase())
                : true;
              return matchesName && matchesNation;
            });

            return (
              <div
                key={column.id}
                className={cn(
                  "flex-shrink-0 w-72 bg-card rounded-xl border border-border/50",
                  "border-t-2",
                  columnColors[column.id],
                )}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{column.title}</h3>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", columnBadgeColors[column.id])}>
                        {filteredClients.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column Content */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn("p-2 min-h-[400px] transition-colors", snapshot.isDraggingOver && "bg-muted/30")}
                    >
                      {filteredClients.map((client, index) => (
                        <Draggable key={client.id} draggableId={client.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => handleClientClick(client)}
                              className={cn(
                                "p-3 mb-2 rounded-lg bg-surface border border-border/30",
                                "hover:border-border transition-all cursor-pointer",
                                snapshot.isDragging && "shadow-xl shadow-black/50 rotate-2",
                              )}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                    {client.avatar_url ? (
                                      <img
                                        src={client.avatar_url}
                                        alt={client.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{client.name}</p>
                                    {client.nationality && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        {client.nationality}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleClientClick(client)}>
                                      Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleClientClick(client)}>
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={async () => {
                                        try {
                                          await deleteClient(client.id);
                                          toast.success("Atleta removido!");
                                        } catch {
                                          toast.error("Erro ao remover atleta");
                                        }
                                      }}
                                    >
                                      Remover
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {client.school && (
                                <div className="flex items-center gap-1.5 text-xs text-primary mb-2">
                                  <School className="w-3 h-3" />
                                  <span className="truncate">{client.school}</span>
                                </div>
                              )}

                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                                {client.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span className="truncate max-w-[80px]">{client.phone}</span>
                                  </div>
                                )}
                                {client.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate max-w-[80px]">{client.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <ClientDetailDialog
        client={selectedClient}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={updateClient}
        onDelete={deleteClient}
      />
    </>
  );
}
