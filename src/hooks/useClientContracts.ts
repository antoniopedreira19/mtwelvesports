import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientContractData {
  clientId: string;
  clientName: string;
  school: string | null;
  avatarUrl: string | null;
  contracts: {
    id: string;
    status: string;
    totalValue: number;
    notes: string | null;
    createdAt: string;
    installments: {
      id: string;
      value: number;
      dueDate: string;
      status: string;
      transactionFee: number;
    }[];
    commissions: {
      id: string;
      employeeName: string;
      percentage: number;
      value: number;
      status: string;
      installmentId: string | null;
    }[];
  }[];
  totalValue: number;
  totalPaid: number;
  totalPending: number;
  hasActive: boolean;
  hasCompleted: boolean;
}

export function useClientContracts() {
  return useQuery({
    queryKey: ["client-contracts"],
    queryFn: async (): Promise<ClientContractData[]> => {
      // Fetch contracts with clients
      const { data: contracts, error: cErr } = await supabase
        .from("contracts")
        .select("*, clients(id, name, school, avatar_url)")
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false });

      if (cErr) throw cErr;
      if (!contracts || contracts.length === 0) return [];

      const contractIds = contracts.map((c) => c.id);

      // Fetch installments and commissions in parallel
      const [instRes, commRes] = await Promise.all([
        supabase.from("installments").select("*").in("contract_id", contractIds),
        supabase.from("commissions").select("*").in("contract_id", contractIds),
      ]);

      if (instRes.error) throw instRes.error;
      if (commRes.error) throw commRes.error;

      const installments = instRes.data || [];
      const commissions = commRes.data || [];

      // Group by client
      const clientMap = new Map<string, ClientContractData>();

      for (const contract of contracts) {
        const client = contract.clients as any;
        if (!client) continue;

        const cId = client.id;
        if (!clientMap.has(cId)) {
          clientMap.set(cId, {
            clientId: cId,
            clientName: client.name,
            school: client.school,
            avatarUrl: client.avatar_url,
            contracts: [],
            totalValue: 0,
            totalPaid: 0,
            totalPending: 0,
            hasActive: false,
            hasCompleted: false,
          });
        }

        const cd = clientMap.get(cId)!;
        const cInstallments = installments
          .filter((i) => i.contract_id === contract.id)
          .map((i) => ({
            id: i.id,
            value: Number(i.value),
            dueDate: i.due_date,
            status: i.status,
            transactionFee: Number(i.transaction_fee || 0),
          }));

        const cCommissions = commissions
          .filter((c) => c.contract_id === contract.id)
          .map((c) => ({
            id: c.id,
            employeeName: c.employee_name,
            percentage: Number(c.percentage),
            value: Number(c.value),
            status: c.status,
            installmentId: c.installment_id,
          }));

        const paid = cInstallments.filter((i) => i.status === "paid").reduce((s, i) => s + i.value, 0);
        const total = cInstallments.reduce((s, i) => s + i.value, 0);

        cd.contracts.push({
          id: contract.id,
          status: contract.status,
          totalValue: Number(contract.total_value),
          notes: contract.notes,
          createdAt: contract.created_at,
          installments: cInstallments,
          commissions: cCommissions,
        });

        cd.totalValue += Number(contract.total_value);
        cd.totalPaid += paid;
        cd.totalPending += total - paid;
        if (contract.status === "active") cd.hasActive = true;
        if (contract.status === "completed") cd.hasCompleted = true;
      }

      return Array.from(clientMap.values());
    },
  });
}
