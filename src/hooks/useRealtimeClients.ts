import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Client, PipelineColumn, PipelineStage } from "@/types";

const initialColumns: PipelineColumn[] = [
  { id: "radar", title: "Radar", clients: [] },
  { id: "contato", title: "Contato", clients: [] },
  { id: "negociacao", title: "Negociação", clients: [] },
  { id: "fechado", title: "Fechado", clients: [] },
  { id: "perdido", title: "Perdido", clients: [] },
];

export function useRealtimeClients() {
  const [columns, setColumns] = useState<PipelineColumn[]>(initialColumns);
  const [isLoading, setIsLoading] = useState(true);

  const organizeClientsIntoColumns = useCallback((clients: Client[]) => {
    return initialColumns.map((col) => ({
      ...col,
      clients: clients.filter((client) => client.stage === col.id),
    }));
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setColumns(organizeClientsIntoColumns(data as Client[]));
    } catch (error) {
      console.error("Erro ao carregar pipeline:", error);
    } finally {
      setIsLoading(false);
    }
  }, [organizeClientsIntoColumns]);

  useEffect(() => {
    fetchClients();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("clients-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        (payload) => {
          console.log("Realtime update:", payload);

          if (payload.eventType === "INSERT") {
            const newClient = payload.new as Client;
            setColumns((prevColumns) =>
              prevColumns.map((col) =>
                col.id === newClient.stage
                  ? { ...col, clients: [newClient, ...col.clients] }
                  : col
              )
            );
          }

          if (payload.eventType === "UPDATE") {
            const updatedClient = payload.new as Client;
            const oldClient = payload.old as { id: string; stage?: PipelineStage };

            setColumns((prevColumns) => {
              // Se o stage mudou, remove da coluna antiga e adiciona na nova
              if (oldClient.stage && oldClient.stage !== updatedClient.stage) {
                return prevColumns.map((col) => {
                  if (col.id === oldClient.stage) {
                    return {
                      ...col,
                      clients: col.clients.filter((c) => c.id !== updatedClient.id),
                    };
                  }
                  if (col.id === updatedClient.stage) {
                    return {
                      ...col,
                      clients: [updatedClient, ...col.clients.filter((c) => c.id !== updatedClient.id)],
                    };
                  }
                  return col;
                });
              }

              // Se apenas outros dados mudaram, atualiza no lugar
              return prevColumns.map((col) => ({
                ...col,
                clients: col.clients.map((c) =>
                  c.id === updatedClient.id ? updatedClient : c
                ),
              }));
            });
          }

          if (payload.eventType === "DELETE") {
            const deletedClient = payload.old as { id: string };
            setColumns((prevColumns) =>
              prevColumns.map((col) => ({
                ...col,
                clients: col.clients.filter((c) => c.id !== deletedClient.id),
              }))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  const updateClientStage = async (clientId: string, newStage: PipelineStage) => {
    const { error } = await supabase
      .from("clients")
      .update({ stage: newStage })
      .eq("id", clientId);

    if (error) throw error;
  };

  const updateClient = async (clientId: string, data: Partial<Client>) => {
    const { error } = await supabase
      .from("clients")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", clientId);

    if (error) throw error;
  };

  const deleteClient = async (clientId: string) => {
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) throw error;
  };

  return {
    columns,
    setColumns,
    isLoading,
    updateClientStage,
    updateClient,
    deleteClient,
    refetch: fetchClients,
  };
}
