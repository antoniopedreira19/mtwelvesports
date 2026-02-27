import { FinancialSummary } from "@/components/modules/financial/FinancialSummary";
import { NewExpenseDialog } from "@/components/modules/financial/NewExpenseDialog";
import { ExpensesTable } from "@/components/modules/financial/ExpensesTable";
import { ActiveClientsTab } from "@/components/modules/financial/ActiveClientsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useQueryClient } from "@tanstack/react-query";

export default function Financeiro() {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["financial"] });
  };
  useRealtimeRefresh(refreshAll);

  return (
    <div className="flex flex-col space-y-6 animate-fade-in w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DRE</h1>
          <p className="text-muted-foreground mt-1">DRE Gerencial, despesas e gestão de clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <NewExpenseDialog onSuccess={refreshAll} />
        </div>
      </div>

      <Tabs defaultValue="dre" className="w-full space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-full md:w-auto grid grid-cols-3 md:flex">
          <TabsTrigger value="dre" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            DRE Gerencial
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Despesas
          </TabsTrigger>
          <TabsTrigger value="clients" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Clientes Ativos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="w-full mt-0 focus-visible:outline-none">
          <div className="w-full">
            <FinancialSummary />
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-0 focus-visible:outline-none">
          <ExpensesTable />
        </TabsContent>

        <TabsContent value="clients" className="mt-0 focus-visible:outline-none">
          <ActiveClientsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
