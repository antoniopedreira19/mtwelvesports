import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AthleteInstallment {
  id: string;
  value: number;
  paymentDate: string;
  status: string;
  contractTotal: number;
  installmentIndex: number;
  totalInstallments: number;
}

export function useAthletePayments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["athlete-payments", user?.id],
    queryFn: async (): Promise<AthleteInstallment[]> => {
      if (!user?.id) return [];

      // Find the client linked to this user
      const { data: client, error: cErr } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cErr) throw cErr;
      if (!client) return [];

      // Fetch contracts for this client
      const { data: contracts, error: ctErr } = await supabase
        .from("contracts")
        .select("id, total_value, status")
        .eq("client_id", client.id)
        .in("status", ["active", "completed"]);

      if (ctErr) throw ctErr;
      if (!contracts || contracts.length === 0) return [];

      const contractIds = contracts.map((c) => c.id);
      const contractMap = new Map(contracts.map((c) => [c.id, c]));

      // Fetch all installments
      const { data: installments, error: iErr } = await supabase
        .from("installments")
        .select("*")
        .in("contract_id", contractIds)
        .order("payment_date", { ascending: true });

      if (iErr) throw iErr;

      // Group by contract to get index
      const byContract = new Map<string, typeof installments>();
      for (const inst of installments || []) {
        const arr = byContract.get(inst.contract_id) || [];
        arr.push(inst);
        byContract.set(inst.contract_id, arr);
      }

      const result: AthleteInstallment[] = [];
      for (const [contractId, insts] of byContract) {
        const contract = contractMap.get(contractId);
        insts.forEach((inst, idx) => {
          result.push({
            id: inst.id,
            value: Number(inst.value),
            paymentDate: inst.payment_date,
            status: inst.status,
            contractTotal: Number(contract?.total_value || 0),
            installmentIndex: idx + 1,
            totalInstallments: insts.length,
          });
        });
      }

      // Sort: pending/overdue first, then by date
      return result.sort((a, b) => {
        const order = (s: string) => (s === "paid" ? 1 : 0);
        if (order(a.status) !== order(b.status)) return order(a.status) - order(b.status);
        return a.paymentDate.localeCompare(b.paymentDate);
      });
    },
    enabled: !!user?.id,
  });
}
