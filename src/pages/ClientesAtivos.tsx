import { useState, useMemo } from "react";
import {
  Plus, Search, ChevronDown, ChevronRight, Check, CircleDollarSign,
  Users, TrendingUp, Clock, CheckCircle2, Loader2, FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientContracts, ClientContractData } from "@/hooks/useClientContracts";
import { ClientSelectorDialog } from "@/components/modules/financial/ClientSelectorDialog";
import { ContractBuilder } from "@/components/modules/financial/ContractBuilder";
import { ContractDetailDialog } from "@/components/modules/financial/ContractDetailDialog";
import { NewClientForm } from "@/components/modules/crm/NewClientDialog";
import { createContract } from "@/services/contractService";
import { checkAndCompleteContract } from "@/services/contractService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { Client, Installment, Commission } from "@/types";
import { toast as sonnerToast } from "sonner";

type InstallmentWithFee = Omit<Installment, "id" | "contract_id"> & { transaction_fee?: number };

export default function ClientesAtivos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  // Contract creation state
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Contract detail state
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clientsData, isLoading: dataLoading } = useClientContracts();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["client-contracts"] });
  };
  useRealtimeRefresh(refreshAll);

  const filteredClients = useMemo(() => {
    if (!clientsData) return [];
    return clientsData.filter((c) => {
      const matchesSearch = c.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.hasActive) ||
        (statusFilter === "completed" && c.hasCompleted && !c.hasActive);
      return matchesSearch && matchesStatus;
    });
  }, [clientsData, searchTerm, statusFilter]);

  // KPI calculations
  const kpis = useMemo(() => {
    if (!clientsData) return { totalActive: 0, totalReceived: 0, totalPending: 0, completedCount: 0 };
    let totalActive = 0, totalReceived = 0, totalPending = 0, completedCount = 0;
    for (const c of clientsData) {
      for (const contract of c.contracts) {
        if (contract.status === "active") totalActive += contract.totalValue;
        if (contract.status === "completed") completedCount++;
      }
      totalReceived += c.totalPaid;
      totalPending += c.totalPending;
    }
    return { totalActive, totalReceived, totalPending, completedCount };
  }, [clientsData]);

  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      paid: { label: "Pago", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
      pending: { label: "Pendente", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
      overdue: { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/20" },
      cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
    };
    const s = map[status] || map.pending;
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
  };

  // Quick pay actions
  const quickPayInstallment = async (installmentId: string, contractId: string) => {
    try {
      const { error } = await supabase.from("installments").update({ status: "paid" }).eq("id", installmentId);
      if (error) throw error;
      await checkAndCompleteContract(contractId);
      sonnerToast.success("Parcela recebida!");
      refreshAll();
    } catch {
      sonnerToast.error("Erro ao baixar parcela.");
    }
  };

  const quickPayCommission = async (commissionId: string, contractId: string) => {
    try {
      const { error } = await supabase.from("commissions").update({ status: "paid" }).eq("id", commissionId);
      if (error) throw error;
      await checkAndCompleteContract(contractId);
      sonnerToast.success("Comissão paga!");
      refreshAll();
    } catch {
      sonnerToast.error("Erro ao pagar comissão.");
    }
  };

  // Contract creation handlers
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setIsClientSelectorOpen(false);
    setIsContractModalOpen(true);
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
      toast({ title: "Contrato Salvo!", description: `Contrato de ${selectedClient.name} cadastrado.` });
      setIsContractModalOpen(false);
      setSelectedClient(null);
      refreshAll();
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar contrato.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const renderClientCard = (client: ClientContractData) => {
    const isExpanded = expandedClients.has(client.clientId);
    const percentage = client.totalValue > 0 ? (client.totalPaid / client.totalValue) * 100 : 0;
    const allInstallments = client.contracts.flatMap((c) =>
      c.installments.map((i) => ({ ...i, contractId: c.id, contractStatus: c.status }))
    );
    const allCommissions = client.contracts.flatMap((c) =>
      c.commissions.map((cm) => ({ ...cm, contractId: c.id }))
    );

    return (
      <div key={client.clientId} className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all">
        {/* Client Header - Clickable */}
        <button
          onClick={() => toggleClient(client.clientId)}
          className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={client.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#E8BD27]/10 text-[#E8BD27] font-semibold">
              {getInitials(client.clientName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground truncate">{client.clientName}</span>
              {client.hasActive && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-1.5 py-0">
                  Ativo
                </Badge>
              )}
              {client.hasCompleted && !client.hasActive && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] px-1.5 py-0">
                  Concluído
                </Badge>
              )}
            </div>
            {client.school && (
              <span className="text-xs text-muted-foreground">{client.school}</span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-6 shrink-0">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold text-sm">{formatCurrency(client.totalValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="font-medium text-sm text-emerald-500">{formatCurrency(client.totalPaid)}</p>
            </div>
            <div className="w-24">
              <Progress value={percentage} className="h-2 [&>div]:bg-[#E8BD27]" />
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{percentage.toFixed(0)}%</p>
            </div>
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-border/50 bg-muted/10">
            {/* Mobile KPIs */}
            <div className="flex md:hidden items-center gap-4 px-5 py-3 border-b border-border/30">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-sm">{formatCurrency(client.totalValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="font-medium text-sm text-emerald-500">{formatCurrency(client.totalPaid)}</p>
              </div>
              <div className="flex-1">
                <Progress value={percentage} className="h-2 [&>div]:bg-[#E8BD27]" />
              </div>
            </div>

            <Tabs defaultValue="parcelas" className="w-full">
              <div className="px-5 pt-3 flex items-center justify-between">
                <TabsList className="h-8 bg-muted/50">
                  <TabsTrigger value="parcelas" className="text-xs h-7 px-3">Parcelas</TabsTrigger>
                  <TabsTrigger value="comissoes" className="text-xs h-7 px-3">Comissões</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  {client.contracts.map((contract) => (
                    <Button
                      key={contract.id}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-muted-foreground hover:text-[#E8BD27]"
                      onClick={() => {
                        setSelectedContractId(contract.id);
                        setIsDetailOpen(true);
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Ver detalhes
                    </Button>
                  ))}
                </div>
              </div>

              <TabsContent value="parcelas" className="mt-0 px-5 pb-4">
                <div className="rounded-lg border border-border/30 overflow-hidden mt-3">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs h-9">Vencimento</TableHead>
                        <TableHead className="text-xs h-9">Valor</TableHead>
                        <TableHead className="text-xs h-9">Taxa</TableHead>
                        <TableHead className="text-xs h-9">Status</TableHead>
                        <TableHead className="text-xs h-9 text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allInstallments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                            Nenhuma parcela
                          </TableCell>
                        </TableRow>
                      ) : (
                        allInstallments.map((inst) => (
                          <TableRow key={inst.id}>
                            <TableCell className="text-sm py-2">{formatDate(inst.dueDate)}</TableCell>
                            <TableCell className="text-sm py-2 font-medium">{formatCurrency(inst.value)}</TableCell>
                            <TableCell className="text-sm py-2 text-muted-foreground">
                              {formatCurrency(inst.transactionFee)}
                            </TableCell>
                            <TableCell className="py-2">{statusBadge(inst.status)}</TableCell>
                            <TableCell className="text-right py-2">
                              {inst.status === "pending" || inst.status === "overdue" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                  onClick={() => quickPayInstallment(inst.id, inst.contractId)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Baixar
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="comissoes" className="mt-0 px-5 pb-4">
                <div className="rounded-lg border border-border/30 overflow-hidden mt-3">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs h-9">Beneficiário</TableHead>
                        <TableHead className="text-xs h-9">%</TableHead>
                        <TableHead className="text-xs h-9">Valor</TableHead>
                        <TableHead className="text-xs h-9">Status</TableHead>
                        <TableHead className="text-xs h-9 text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allCommissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                            Nenhuma comissão
                          </TableCell>
                        </TableRow>
                      ) : (
                        allCommissions.map((comm) => (
                          <TableRow key={comm.id}>
                            <TableCell className="text-sm py-2 font-medium">{comm.employeeName}</TableCell>
                            <TableCell className="text-sm py-2 text-muted-foreground">{comm.percentage}%</TableCell>
                            <TableCell className="text-sm py-2">{formatCurrency(comm.value)}</TableCell>
                            <TableCell className="py-2">{statusBadge(comm.status)}</TableCell>
                            <TableCell className="text-right py-2">
                              {comm.status === "pending" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                  onClick={() => quickPayCommission(comm.id, comm.contractId)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Pagar
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-6 animate-fade-in w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Contratos</h1>
          <p className="text-muted-foreground mt-1">Gestão de contratos, parcelas e comissões.</p>
        </div>
        <Button
          className="gold-gradient text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
          onClick={() => setIsClientSelectorOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#E8BD27]/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[#E8BD27]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contratos Ativos</p>
                <p className="text-lg font-bold">{formatCurrency(kpis.totalActive)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CircleDollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Recebido</p>
                <p className="text-lg font-bold text-emerald-500">{formatCurrency(kpis.totalReceived)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pendente</p>
                <p className="text-lg font-bold text-amber-500">{formatCurrency(kpis.totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Concluídos</p>
                <p className="text-lg font-bold">{kpis.completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                statusFilter === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Concluídos"}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      {dataLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
          <Users className="w-16 h-16 mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
          <Button variant="link" className="text-[#E8BD27]" onClick={() => setIsClientSelectorOpen(true)}>
            Criar contrato agora
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map(renderClientCard)}
        </div>
      )}

      {/* Dialogs */}
      <ClientSelectorDialog
        open={isClientSelectorOpen}
        onOpenChange={setIsClientSelectorOpen}
        onSelectClient={handleSelectClient}
        onCreateNewClient={() => {
          setIsClientSelectorOpen(false);
          setIsNewClientDialogOpen(true);
        }}
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
