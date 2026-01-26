import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contract, Client } from "@/types";

export interface ContractWithClient extends Omit<Contract, "clients"> {
  clients: Pick<Client, "name" | "school" | "avatar_url"> | null;
}

export function useActiveContracts() {
  return useQuery({
    queryKey: ["contracts", "active"],
    queryFn: async (): Promise<ContractWithClient[]> => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          clients (
            name,
            school,
            avatar_url
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContractWithClient[];
    },
  });
}

export function useCompletedContracts() {
  return useQuery({
    queryKey: ["contracts", "completed"],
    queryFn: async (): Promise<ContractWithClient[]> => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          clients (
            name,
            school,
            avatar_url
          )
        `)
        .eq("status", "completed")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as ContractWithClient[];
    },
  });
}

export function useContractProgress(contractId: string) {
  return useQuery({
    queryKey: ["contract-progress", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installments")
        .select("value, status")
        .eq("contract_id", contractId);

      if (error) throw error;

      const total = data.reduce((sum, i) => sum + Number(i.value), 0);
      const paid = data
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + Number(i.value), 0);

      return { total, paid, percentage: total > 0 ? (paid / total) * 100 : 0 };
    },
    enabled: !!contractId,
  });
}
