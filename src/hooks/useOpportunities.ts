import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OpportunityStage = 'prospecting' | 'in_conversation' | 'visiting' | 'offer' | 'committed' | 'rejected';

export interface Opportunity {
  id: string;
  client_id: string;
  user_id: string | null;
  institution_name: string;
  institution_type: string;
  stage: OpportunityStage;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const stageLabels: Record<OpportunityStage, string> = {
  prospecting: "Prospectando",
  in_conversation: "Em Conversa",
  visiting: "Visitando",
  offer: "Offer",
  committed: "Committed",
  rejected: "Rejected",
};

export const stageColors: Record<OpportunityStage, string> = {
  prospecting: "bg-muted text-muted-foreground border-border/30",
  in_conversation: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  visiting: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  offer: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  committed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  rejected: "bg-destructive/15 text-destructive border-destructive/25",
};

export const institutionTypeLabels: Record<string, string> = {
  university: "Universidade",
  school: "Escola",
  team: "Time",
};

export function useOpportunities(clientId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["opportunities", clientId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Opportunity[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: {
      institution_name: string;
      institution_type: string;
      stage: OpportunityStage;
      notes?: string;
      user_id?: string | null;
    }) => {
      const { error } = await supabase
        .from("opportunities" as any)
        .insert({ client_id: clientId, ...input } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Opportunity> & { id: string }) => {
      const { error } = await supabase
        .from("opportunities" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("opportunities" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
}
