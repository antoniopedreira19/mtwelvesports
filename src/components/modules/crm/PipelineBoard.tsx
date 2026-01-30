import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PipelineColumn, Client, PipelineStage } from "@/types";
import { cn } from "@/lib/utils";
import { capitalizeWords } from "@/lib/utils";
import { Phone, Mail, MoreHorizontal, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRealtimeClients } from "@/hooks/useRealtimeClients";
import { ClientViewDialog } from "./ClientViewDialog";
import { ClientDetailDialog } from "./ClientDetailDialog";
import { MeetingDialog } from "./MeetingDialog";
import { LostReasonDialog } from "./LostReasonDialog";
import { supabase } from "@/integrations/supabase/client";

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
  
  // View dialog state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [clientContractValue, setClientContractValue] = useState<number | null>(null);
  
  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Meeting dialog state
  const [meetingClient, setMeetingClient] = useState<Client | null>(null);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [pendingMeetingDrag, setPendingMeetingDrag] = useState<{
    client: Client;
    sourceColumnId: string;
    destColumnId: string;
    sourceIndex: number;
    destIndex: number;
  } | null>(null);
  
  // Lost reason dialog state
  const [lostClient, setLostClient] = useState<Client | null>(null);
  const [isLostOpen, setIsLostOpen] = useState(false);
  const [pendingLostDrag, setPendingLostDrag] = useState<{
    client: Client;
    sourceColumnId: string;
    destColumnId: string;
    sourceIndex: number;
    destIndex: number;
  } | null>(null);

  // Fetch contract value when viewing a closed client
  useEffect(() => {
    const fetchContractValue = async () => {
      if (selectedClient && selectedClient.stage === "fechado") {
        const { data } = await supabase
          .from("contracts")
          .select("total_value")
          .eq("client_id", selectedClient.id)
          .maybeSingle();
        
        setClientContractValue(data?.total_value ?? null);
      } else {
        setClientContractValue(null);
      }
    };
    
    fetchContractValue();
  }, [selectedClient]);

  // Contract values for closed clients in cards
  const [contractValues, setContractValues] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const fetchContractValues = async () => {
      const closedClients = columns
        .find((col) => col.id === "fechado")?.clients || [];
      
      if (closedClients.length === 0) return;
      
      const { data } = await supabase
        .from("contracts")
        .select("client_id, total_value")
        .in("client_id", closedClients.map((c) => c.id));
      
      if (data) {
        const values: Record<string, number> = {};
        data.forEach((contract) => {
          values[contract.client_id] = contract.total_value;
        });
        setContractValues(values);
      }
    };
    
    fetchContractValues();
  }, [columns]);

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setIsViewOpen(true);
  };

  const handleEditFromView = () => {
    setIsViewOpen(false);
    setIsEditOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const applyDrag = (
    sourceColumnId: string,
    destColumnId: string,
    sourceIndex: number,
    destIndex: number,
    updatedClient: Client
  ) => {
    const sourceColumn = columns.find((col) => col.id === sourceColumnId);
    const destColumn = columns.find((col) => col.id === destColumnId);
    
    if (!sourceColumn || !destColumn) return;
    
    const sourceClients = [...sourceColumn.clients];
    sourceClients.splice(sourceIndex, 1);
    
    const destClients = [...destColumn.clients];
    destClients.splice(destIndex, 0, updatedClient);
    
    setColumns(
      columns.map((col) => {
        if (col.id === sourceColumnId) {
          return { ...col, clients: sourceClients };
        }
        if (col.id === destColumnId) {
          return { ...col, clients: destClients };
        }
        return col;
      })
    );
  };

  const revertDrag = (
    sourceColumnId: string,
    destColumnId: string,
    sourceIndex: number,
    client: Client
  ) => {
    // Revert the optimistic update
    const sourceColumn = columns.find((col) => col.id === sourceColumnId);
    if (!sourceColumn) return;
    
    const sourceClients = [...sourceColumn.clients];
    sourceClients.splice(sourceIndex, 0, client);
    
    setColumns(
      columns.map((col) => {
        if (col.id === sourceColumnId) {
          return { ...col, clients: sourceClients };
        }
        if (col.id === destColumnId) {
          return { ...col, clients: col.clients.filter((c) => c.id !== client.id) };
        }
        return col;
      })
    );
  };

  const handleMeetingConfirm = async (clientId: string, meetingDate: Date, responsible: string) => {
    if (!pendingMeetingDrag) return;
    
    try {
      const dateStr = meetingDate.toISOString().split("T")[0];
      
      await supabase
        .from("clients")
        .update({
          stage: "negociacao",
          meeting_date: dateStr,
          meeting_responsible: responsible,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);
      
      toast.success("Reunião agendada!");
    } catch (error) {
      toast.error("Erro ao agendar reunião");
      revertDrag(
        pendingMeetingDrag.sourceColumnId,
        pendingMeetingDrag.destColumnId,
        pendingMeetingDrag.sourceIndex,
        pendingMeetingDrag.client
      );
    } finally {
      setPendingMeetingDrag(null);
      setMeetingClient(null);
    }
  };

  const handleMeetingCancel = () => {
    if (pendingMeetingDrag) {
      revertDrag(
        pendingMeetingDrag.sourceColumnId,
        pendingMeetingDrag.destColumnId,
        pendingMeetingDrag.sourceIndex,
        pendingMeetingDrag.client
      );
      setPendingMeetingDrag(null);
    }
    setMeetingClient(null);
  };

  const handleLostConfirm = async (clientId: string, reason: string) => {
    if (!pendingLostDrag) return;
    
    try {
      await supabase
        .from("clients")
        .update({
          stage: "perdido",
          lost_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);
      
      toast.success("Lead marcado como perdido");
    } catch (error) {
      toast.error("Erro ao salvar motivo");
      revertDrag(
        pendingLostDrag.sourceColumnId,
        pendingLostDrag.destColumnId,
        pendingLostDrag.sourceIndex,
        pendingLostDrag.client
      );
    } finally {
      setPendingLostDrag(null);
      setLostClient(null);
    }
  };

  const handleLostCancel = () => {
    if (pendingLostDrag) {
      revertDrag(
        pendingLostDrag.sourceColumnId,
        pendingLostDrag.destColumnId,
        pendingLostDrag.sourceIndex,
        pendingLostDrag.client
      );
      setPendingLostDrag(null);
    }
    setLostClient(null);
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

    // Same column reorder
    if (source.droppableId === destination.droppableId) {
      sourceClients.splice(destination.index, 0, updatedClient);
      setColumns(columns.map((col) => (col.id === source.droppableId ? { ...col, clients: sourceClients } : col)));
      return;
    }

    // Optimistic update
    applyDrag(source.droppableId, destination.droppableId, source.index, destination.index, updatedClient);

    // Handle special cases
    if (destination.droppableId === "negociacao") {
      setMeetingClient(movedClient);
      setPendingMeetingDrag({
        client: movedClient,
        sourceColumnId: source.droppableId,
        destColumnId: destination.droppableId,
        sourceIndex: source.index,
        destIndex: destination.index,
      });
      setIsMeetingOpen(true);
      return;
    }

    if (destination.droppableId === "perdido") {
      setLostClient(movedClient);
      setPendingLostDrag({
        client: movedClient,
        sourceColumnId: source.droppableId,
        destColumnId: destination.droppableId,
        sourceIndex: source.index,
        destIndex: destination.index,
      });
      setIsLostOpen(true);
      return;
    }

    // Persist to Supabase
    try {
      await updateClientStage(movedClient.id, destination.droppableId as PipelineStage);

      if (destination.droppableId === "fechado") {
        onClientMoveToFechado(updatedClient);
      }
    } catch (error) {
      toast.error("Erro ao salvar mudança de status");
      revertDrag(source.droppableId, destination.droppableId, source.index, movedClient);
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
                      <span
                        className={cn("px-2 py-0.5 rounded-full text-xs font-medium", columnBadgeColors[column.id])}
                      >
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
                                <div>
                                  <p className="font-medium text-sm">
                                    {capitalizeWords(client.name)}
                                  </p>
                                  {client.nationality && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                      <MapPin className="w-3 h-3" />
                                      {capitalizeWords(client.nationality)}
                                    </div>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover">
                                    <DropdownMenuItem onClick={() => handleClientClick(client)}>
                                      Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedClient(client);
                                      setIsEditOpen(true);
                                    }}>
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={async () => {
                                        try {
                                          await deleteClient(client.id);
                                          toast.success("Lead removido!");
                                        } catch {
                                          toast.error("Erro ao remover lead");
                                        }
                                      }}
                                    >
                                      Remover
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
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

                              {/* Contract value for closed clients */}
                              {column.id === "fechado" && contractValues[client.id] && (
                                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-success">
                                  <DollarSign className="w-3 h-3" />
                                  {formatCurrency(contractValues[client.id])}
                                </div>
                              )}
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

      {/* View Dialog */}
      <ClientViewDialog
        client={selectedClient}
        contractValue={clientContractValue}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        onEdit={handleEditFromView}
        onDelete={deleteClient}
      />

      {/* Edit Dialog */}
      <ClientDetailDialog
        client={selectedClient}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdate={updateClient}
        onDelete={deleteClient}
      />

      {/* Meeting Dialog */}
      <MeetingDialog
        client={meetingClient}
        open={isMeetingOpen}
        onOpenChange={setIsMeetingOpen}
        onConfirm={handleMeetingConfirm}
        onCancel={handleMeetingCancel}
      />

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        client={lostClient}
        open={isLostOpen}
        onOpenChange={setIsLostOpen}
        onConfirm={handleLostConfirm}
        onCancel={handleLostCancel}
      />
    </>
  );
}
