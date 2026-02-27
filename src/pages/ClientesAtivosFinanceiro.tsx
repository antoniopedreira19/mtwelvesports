import { ActiveClientsTab } from "@/components/modules/financial/ActiveClientsTab";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useQueryClient } from "@tanstack/react-query";

export default function ClientesAtivosFinanceiro() {
  const queryClient = useQueryClient();
  useRealtimeRefresh(() => {
    queryClient.invalidateQueries({ queryKey: ["client-contracts"] });
    queryClient.invalidateQueries({ queryKey: ["payer-data"] });
  });

  return (
    <div className="flex flex-col space-y-6 animate-fade-in w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes Ativos</h1>
        <p className="text-muted-foreground mt-1">Gestão de informações e pagadores dos clientes ativos.</p>
      </div>
      <ActiveClientsTab />
    </div>
  );
}
