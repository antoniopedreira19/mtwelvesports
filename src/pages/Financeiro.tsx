import { useState, useEffect } from "react";
import { Plus, Loader2, Users, CheckCircle2, History } from "lucide-react";
import { FinancialSummary } from "@/components/modules/financial/FinancialSummary";
import { ContractBuilder } from "@/components/modules/financial/ContractBuilder";
import { ClientSelectorDialog } from "@/components/modules/financial/ClientSelectorDialog";
import { ContractDetailDialog } from "@/components/modules/financial/ContractDetailDialog";
import { NewExpenseDialog } from "@/components/modules/financial/NewExpenseDialog";
import { ExpensesTable } from "@/components/modules/financial/ExpensesTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useActiveContracts, useCompletedContracts, ContractWithClient } from "@/hooks/useContracts";
import { createContract } from "@/services/contractService";
import { Client, Installment, Commission } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NewClientForm } from "@/components/modules/crm/NewClientDialog";
// Importação do Hook de Realtime
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

type InstallmentWithFee = Omit<Installment, "id" | "contract_id"> & { transaction_fee?: number };

export default function Financeiro() {
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const { data: activeContracts, isLoading: contractsLoading, refetch: refetchContracts } = useActiveContracts();
  const { data: completedContracts, isLoading: completedLoading, refetch: refetchCompleted } = useCompletedContracts();

  const [contractProgress, setContractProgress] = useState<Record<string, { paid: number; total: number }>>({});

  // Realtime update: Recarrega as listas quando houver mudanças no banco
  const refreshAll = () => {
    refetchContracts();
    refetchCompleted();
  };
  useRealtimeRefresh(refreshAll);

  useEffect(() => {
    const fetchProgress = async () => {
      const allContracts = [...(activeContracts || []), ...(completedContracts || [])];
      if (allContracts.length === 0) return;

      const progressMap: Record<string, { paid: number; total: number }> = {};

      for (const contract of allContracts) {
        const { data } = await supabase.from("installments").select("value, status").eq("contract_id", contract.id);

        if (data) {
          const total = data.reduce((sum, i) => sum + Number(i.value), 0);
          const paid = data.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.value), 0);
          progressMap[contract.id] = { total, paid };
        }
      }

      setContractProgress(progressMap);
    };

    fetchProgress();
  }, [activeContracts, completedContracts]);

  const handleOpenNewContract = () => {
    setIsClientSelectorOpen(true);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setIsClientSelectorOpen(false);
    setIsContractModalOpen(true);
  };

  const handleCreateNewClient = () => {
    setIsClientSelectorOpen(false);
    setIsNewClientDialogOpen(true);
  };

  const handleNewClientCreated = (client?: Client) => {
    setIsNewClientDialogOpen(false);
    if (client) {
      setSelectedClient(client);
      setIsContractModalOpen(true);
    } else {
      setIsClientSelectorOpen(true);
    }
  };

  const handleSaveContract = async (data: {
    totalValue: number;
    installments: InstallmentWithFee[];
    commissions: Omit<Commission, "id" | "contract_id" | "value" | "installment_id" | "status">[];
    transactionFee: number;
  }) => {
    if (!selectedClient) return;

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
      setSelectedClient(null);
      refreshAll();
    } catch (error) {
      console.error("Erro ao salvar contrato:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar contrato.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenContractDetail = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsDetailOpen(true);
  };

  const renderContractCard = (contract: ContractWithClient, isCompleted = false) => {
    const progress = contractProgress[contract.id] || { paid: 0, total: Number(contract.total_value) };
    const percentage = progress.total > 0 ? (progress.paid / progress.total) * 100 : 0;

    return (
      <div
        key={contract.id}
        onClick={() => handleOpenContractDetail(contract.id)}
        className={`p-5 rounded-xl bg-card border border-border/50 transition-all group cursor-pointer ${
          isCompleted ? "hover:border-blue-500/30" : "hover:border-[#E8BD27]/30 hover:shadow-md"
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={contract.clients?.avatar_url || undefined} />
            <AvatarFallback className={isCompleted ? "bg-blue-500/10 text-blue-500" : "bg-[#E8BD27]/10 text-[#E8BD27]"}>
              {contract.clients ? getInitials(contract.clients.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isCompleted ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
            }`}
          >
            {isCompleted ? "Concluído" : "Ativo"}
          </span>
        </div>
        <h3 className="font-semibold mb-4 text-lg">{contract.clients?.name || "Cliente"}</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor Total</span>
            <span className="font-bold text-foreground">{formatCurrency(Number(contract.total_value))}</span>
          </div>
          {!isCompleted && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Recebido</span>
              <span className="text-emerald-500 font-medium">
                {formatCurrency(progress.paid)} ({percentage.toFixed(0)}%)
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${isCompleted ? "bg-blue-500 w-full" : "bg-[#E8BD27]"}`}
              style={{ width: isCompleted ? "100%" : `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-6 animate-fade-in w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Gestão estratégica, fluxo de caixa e contratos.</p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-3">
          <NewExpenseDialog onSuccess={refreshAll} />
          <Button
            className="gold-gradient text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
            onClick={handleOpenNewContract}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Contrato
          </Button>
        </div>
      </div>

      {/* Abas */}
      <Tabs defaultValue="dre" className="w-full space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-full md:w-auto grid grid-cols-3 md:flex">
          <TabsTrigger value="dre" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            DRE Gerencial
          </TabsTrigger>
          <TabsTrigger
            value="contracts"
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Contratos
          </TabsTrigger>
          <TabsTrigger
            value="expenses"
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Despesas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="w-full mt-0 focus-visible:outline-none">
          <div className="w-full">
            <FinancialSummary />
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="mt-0 focus-visible:outline-none">
          <Tabs defaultValue="active" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-transparent border border-border/50 p-0 h-9 rounded-lg">
                <TabsTrigger
                  value="active"
                  className="px-4 h-full rounded-l-lg rounded-r-none data-[state=active]:bg-muted data-[state=active]:text-foreground border-r border-border/50"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Ativos ({activeContracts?.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="px-4 h-full rounded-l-none rounded-r-lg data-[state=active]:bg-muted data-[state=active]:text-foreground"
                >
                  <History className="w-4 h-4 mr-2" />
                  Concluídos ({completedContracts?.length || 0})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="active" className="mt-0">
              {contractsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted" />
                </div>
              ) : activeContracts && activeContracts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeContracts.map((c) => renderContractCard(c, false))}
                  <button
                    onClick={handleOpenNewContract}
                    className="p-5 rounded-xl border-2 border-dashed border-border/50 hover:border-[#E8BD27]/50 hover:bg-muted/5 transition-all flex flex-col items-center justify-center min-h-[240px] text-muted-foreground hover:text-[#E8BD27] gap-3"
                  >
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-[#E8BD27]/10 transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-medium">Novo Contrato</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                  <Users className="w-16 h-16 mb-4 opacity-20" />
                  <h3 className="text-lg font-medium mb-2">Nenhum contrato ativo</h3>
                  <Button variant="link" onClick={handleOpenNewContract} className="text-[#E8BD27]">
                    Criar contrato agora
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              {completedLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted" />
                </div>
              ) : completedContracts && completedContracts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedContracts.map((c) => renderContractCard(c, true))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                  <History className="w-16 h-16 mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">Nenhum histórico disponível</h3>
                  <p className="text-sm">Contratos finalizados aparecerão aqui.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="expenses" className="mt-0 focus-visible:outline-none">
          <ExpensesTable />
        </TabsContent>
      </Tabs>

      <ClientSelectorDialog
        open={isClientSelectorOpen}
        onOpenChange={setIsClientSelectorOpen}
        onSelectClient={handleSelectClient}
        onCreateNewClient={handleCreateNewClient}
      />

      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Novo Atleta</DialogTitle>
          </DialogHeader>
          <NewClientForm onSuccess={handleNewClientCreated} />
        </DialogContent>
      </Dialog>

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
                setSelectedClient(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ContractDetailDialog
        contractId={selectedContractId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onContractUpdated={refreshAll}
      />
    </div>
  );
}
