import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type TransactionRow = Tables<'transactions'>;

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('due_date', { ascending: false });
      
      if (error) throw error;
      return data as TransactionRow[];
    },
  });
}

export function useFinancialOverview() {
  return useQuery({
    queryKey: ['financial-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_overview')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}
