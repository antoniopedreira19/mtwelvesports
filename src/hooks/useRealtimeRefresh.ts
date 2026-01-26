import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeRefresh(onRefresh: () => void) {
  useEffect(() => {
    // Inscreve-se em mudanças globais no banco (qualquer insert/update/delete) nas tabelas principais
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta tudo (INSERT, UPDATE, DELETE)
          schema: 'public',
        },
        () => {
          // Chama a função de recarregar dados que passamos por parâmetro
          onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);
}
