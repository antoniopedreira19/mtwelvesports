import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type FinancialOverviewRow = Tables<'financial_overview'>;

export function useTransactions() {
  return useQuery({
    queryKey: ['financial-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_overview')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as FinancialOverviewRow[];
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
