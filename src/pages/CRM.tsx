import { useState } from "react";
import { Search, Globe, CalendarDays } from "lucide-react";
import { PipelineBoard } from "@/components/modules/crm/PipelineBoard";
import { NewClientDialog } from "@/components/modules/crm/NewClientDialog";
import { ContractBuilder } from "@/components/modules/financial/ContractBuilder";
import { Client, Installment, Commission } from "@/types";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createContract } from "@/services/contractService";

type InstallmentWithFee = Omit<Installment, "id" | "contract_id"> & { transaction_fee?: number };

export default function CRM() {
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(""); // NOVO ESTADO: Filtro de Mês

  // Estado para forçar atualização do Board
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { toast } = useToast();

  const handleClientMoveToFechado = (client: Client) => {
    setSelectedClient(client);
    setIsContractModalOpen(true);
  };

  const handleSaveContract = async (data: {
    totalValue: number;
    installments: InstallmentWithFee[];
    commissions: Omit<Commission, "id" | "contract_id" | "value" | "installment_id" | "status">[];
  }) => {
    if (!selectedClient) {
      toast({
        title: "Erro",
        description: "Nenhum cliente selecionado.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await createContract({
        clientId: selectedClient.id,
        totalValue: data.totalValue,
        installments: data.installments,
        commissions: data.commissions,
      });

      toast({
        title: "Contrato Salvo!",
        description: `Contrato de ${selectedClient.name} cadastrado com sucesso.`,
      });

      setIsContractModalOpen(false);
      setSelectedClient(undefined);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Erro ao salvar contrato:", error);
      toast({
        title: "Erro ao salvar contrato",
        description: "Ocorreu um erro ao cadastrar o contrato. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu pipeline de atletas</p>
        </div>

        <NewClientDialog onSuccess={handleClientCreated} />
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou clube..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="relative flex-1 md:max-w-[250px]">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nacionalidade..."
            value={nationalityFilter}
            onChange={(e) => setNationalityFilter(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        {/* NOVO: Input de Mês */}
        <div className="relative flex-1 md:max-w-[200px]">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="pl-9 bg-background text-muted-foreground"
          />
        </div>
      </div>

      {/* Pipeline Board */}
      <PipelineBoard
        key={refreshTrigger}
        onClientMoveToFechado={handleClientMoveToFechado}
        searchTerm={searchTerm}
        nationalityFilter={nationalityFilter}
        monthFilter={monthFilter} // Passando o novo filtro
      />

      {/* Contract Modal */}
      <Dialog open={isContractModalOpen} onOpenChange={setIsContractModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border p-0 gap-0">
          <DialogHeader className="p-6 pb-2 border-b border-border/50">
            <DialogTitle className="text-xl flex items-center gap-2">
              <span className="w-1 h-6 bg-[#E8BD27] rounded-full inline-block"></span>
              Novo Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <ContractBuilder
              client={selectedClient ? { id: selectedClient.id, name: selectedClient.name } : undefined}
              onSave={handleSaveContract}
              onCancel={() => {
                setIsContractModalOpen(false);
                setSelectedClient(undefined);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
