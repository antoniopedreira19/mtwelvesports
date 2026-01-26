import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KPIData {
  monthlyRevenue: number;
  burnRate: number;
  profit: number;
  activeClients: number;
  pendingDeals: number;
  closedDeals: number;
}

export function useKPIData() {
  return useQuery({
    queryKey: ['kpi-data'],
    queryFn: async () => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get clients count by stage
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('stage');
      
      if (clientsError) throw clientsError;

      const activeClients = clients?.filter(c => 
        c.stage !== 'perdido'
      ).length || 0;

      const pendingDeals = clients?.filter(c => 
        c.stage === 'contato' || c.stage === 'negociacao'
      ).length || 0;

      const closedDeals = clients?.filter(c => 
        c.stage === 'fechado'
      ).length || 0;

      // Get transactions for this month
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('type, value')
        .gte('due_date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('due_date', lastDayOfMonth.toISOString().split('T')[0]);

      if (txError) throw txError;

      const monthlyRevenue = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.value), 0) || 0;

      // Get expenses for burn rate
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('due_date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('due_date', lastDayOfMonth.toISOString().split('T')[0]);

      if (expError) throw expError;

      const burnRate = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const profit = monthlyRevenue - burnRate;

      return {
        monthlyRevenue,
        burnRate,
        profit,
        activeClients,
        pendingDeals,
        closedDeals,
      } as KPIData;
    },
  });
}
