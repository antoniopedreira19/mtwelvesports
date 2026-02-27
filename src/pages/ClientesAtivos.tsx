import { useState, useMemo } from "react";
import {
  Plus, Search, ChevronDown, ChevronRight, Check, CircleDollarSign,
  Users, TrendingUp, Clock, CheckCircle2, Loader2, FileText, AlertTriangle,
  Calendar,
} from "lucide-react";
import { format, parseISO, isSameMonth, isBefore, startOfDay } from "date-fns";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientContracts, ClientContractData } from "@/hooks/useClientContracts";
import { ClientSelectorDialog } from "@/components/modules/financial/ClientSelectorDialog";
import { ContractBuilder } from "@/components/modules/financial/ContractBuilder";
import { ContractDetailDialog } from "@/components/modules/financial/ContractDetailDialog";
import { PaymentConfirmDialog } from "@/components/modules/financial/PaymentConfirmDialog";
import { NewClientForm } from "@/components/modules/crm/NewClientDialog";
import { createContract } from "@/services/contractService";
import { checkAndCompleteContract, updateInstallmentValue } from "@/services/contractService";
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
  const [topTab, setTopTab] = useState("contratos");

  // Cobranças month filter
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  // Contract creation state
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Contract detail state
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Payment confirm modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInstallment, setPaymentInstallment] = useState<{
    id: string; value: number; dueDate: string; contractId: string; transactionFee?: number;
  } | null>(null);
  const [paymentClientName, setPaymentClientName] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clientsData, isLoading: dataLoading } = useClientContracts();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["client-contracts"] });
  };
  useRealtimeRefresh(refreshAll);

  // --- Shared helpers ---
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

  // --- Quick pay actions ---
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

  // Payment confirm handler (Cobranças modal)
  const handlePaymentConfirm = async (data: {
    installmentId: string;
    contractId: string;
    paidValue: number;
    transactionFee: number;
  }) => {
    try {
      // Update installment value, fee, and recalculate commissions
      await updateInstallmentValue(data.installmentId, data.paidValue, data.transactionFee);
      // Mark as paid
      const { error } = await supabase.from("installments").update({ status: "paid" }).eq("id", data.installmentId);
      if (error) throw error;

      // Recalculate contract total based on actual paid values
      const { data: allInstallments } = await supabase
        .from("installments")
        .select("value")
        .eq("contract_id", data.contractId);
      if (allInstallments) {
        const newTotal = allInstallments.reduce((sum, i) => sum + Number(i.value), 0);
        await supabase.from("contracts").update({ total_value: newTotal }).eq("id", data.contractId);
      }

      await checkAndCompleteContract(data.contractId);
      sonnerToast.success("Parcela recebida com sucesso!");
      refreshAll();
    } catch {
      sonnerToast.error("Erro ao confirmar recebimento.");
      throw new Error("Erro ao confirmar recebimento");
    }
  };

  const openPaymentModal = (inst: { id: string; value: number; dueDate: string; contractId: string; transactionFee?: number }, clientName: string) => {
    setPaymentInstallment(inst);
    setPaymentClientName(clientName);
    setPaymentModalOpen(true);
  };

  // --- Contratos tab logic ---
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

  // --- Contract creation handlers ---
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

  // --- Cobranças tab logic ---
  const availableMonths = useMemo(() => {
    if (!clientsData) return [];
    const monthSet = new Set<string>();
    for (const client of clientsData) {
      for (const contract of client.contracts) {
        for (const inst of contract.installments) {
          if (inst.status === "pending" || inst.status === "overdue") {
            const d = new Date(inst.dueDate.includes("T") ? inst.dueDate : inst.dueDate + "T12:00:00");
            monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          }
        }
      }
    }
    // Always include current month
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    monthSet.add(cur);
    return Array.from(monthSet).sort();
  }, [clientsData]);

  const cobrancasData = useMemo(() => {
    if (!clientsData) return [];
    const [year, month] = selectedMonth.split("-").map(Number);
    const refDate = new Date(year, month - 1, 1);
    const today = startOfDay(new Date());

    type CobrancaInstallment = {
      id: string;
      value: number;
      dueDate: string;
      status: string;
      contractId: string;
      isOverdue: boolean;
    };

    type CobrancaClient = {
      clientId: string;
      clientName: string;
      school: string | null;
      avatarUrl: string | null;
      installments: CobrancaInstallment[];
      totalPending: number;
      hasOverdue: boolean;
    };

    const clientMap = new Map<string, CobrancaClient>();

    for (const client of clientsData) {
      for (const contract of client.contracts) {
        for (const inst of contract.installments) {
          if (inst.status !== "pending" && inst.status !== "overdue") continue;
          const d = new Date(inst.dueDate.includes("T") ? inst.dueDate : inst.dueDate + "T12:00:00");
          if (!isSameMonth(d, refDate)) continue;

          if (!clientMap.has(client.clientId)) {
            clientMap.set(client.clientId, {
              clientId: client.clientId,
              clientName: client.clientName,
              school: client.school,
              avatarUrl: client.avatarUrl,
              installments: [],
              totalPending: 0,
              hasOverdue: false,
            });
          }

          const cd = clientMap.get(client.clientId)!;
          const isOverdue = inst.status === "overdue" || isBefore(d, today);
          cd.installments.push({
            id: inst.id,
            value: inst.value,
            dueDate: inst.dueDate,
            status: isOverdue ? "overdue" : "pending",
            contractId: contract.id,
            isOverdue,
          });
          cd.totalPending += inst.value;
          if (isOverdue) cd.hasOverdue = true;
        }
      }
    }

    // Sort: overdue clients first
    return Array.from(clientMap.values()).sort((a, b) => {
      if (a.hasOverdue && !b.hasOverdue) return -1;
      if (!a.hasOverdue && b.hasOverdue) return 1;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [clientsData, selectedMonth]);

  const cobrancasKpis = useMemo(() => {
    let totalCobrar = 0;
    let totalClientes = cobrancasData.length;
    let overdueCount = 0;
    for (const c of cobrancasData) {
      totalCobrar += c.totalPending;
      overdueCount += c.installments.filter((i) => i.isOverdue).length;
    }
    return { totalCobrar, totalClientes, overdueCount };
  }, [cobrancasData]);

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return format(d, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase());
  };

  // --- Render client card (Contratos tab) ---
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
        <button
          onClick={() => toggleClient(client.clientId)}
          className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="shrink-0">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={client.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#E8BD27]/10 text-[#E8BD27] font-semibold">{getInitials(client.clientName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground truncate">{client.clientName}</span>
              {client.hasActive && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-1.5 py-0">Ativo</Badge>}
              {client.hasCompleted && !client.hasActive && <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] px-1.5 py-0">Concluído</Badge>}
            </div>
            {client.school && <span className="text-xs text-muted-foreground">{client.school}</span>}
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

        {isExpanded && (
          <div className="border-t border-border/50 bg-muted/10">
            <div className="flex md:hidden items-center gap-4 px-5 py-3 border-b border-border/30">
              <div><p className="text-xs text-muted-foreground">Total</p><p className="font-bold text-sm">{formatCurrency(client.totalValue)}</p></div>
              <div><p className="text-xs text-muted-foreground">Recebido</p><p className="font-medium text-sm text-emerald-500">{formatCurrency(client.totalPaid)}</p></div>
              <div className="flex-1"><Progress value={percentage} className="h-2 [&>div]:bg-[#E8BD27]" /></div>
            </div>
            <Tabs defaultValue="parcelas" className="w-full">
              <div className="px-5 pt-3 flex items-center justify-between">
                <TabsList className="h-8 bg-muted/50">
                  <TabsTrigger value="parcelas" className="text-xs h-7 px-3">Parcelas</TabsTrigger>
                  <TabsTrigger value="comissoes" className="text-xs h-7 px-3">Comissões</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  {client.contracts.map((contract) => (
                    <Button key={contract.id} variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-[#E8BD27]" onClick={() => { setSelectedContractId(contract.id); setIsDetailOpen(true); }}>
                      <FileText className="h-3 w-3 mr-1" />Ver detalhes
                    </Button>
                  ))}
                </div>
              </div>
              <TabsContent value="parcelas" className="mt-0 px-5 pb-4">
                <div className="rounded-lg border border-border/30 overflow-hidden mt-3">
                  <Table>
                    <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-xs h-9">Vencimento</TableHead><TableHead className="text-xs h-9">Valor</TableHead><TableHead className="text-xs h-9">Taxa</TableHead><TableHead className="text-xs h-9">Status</TableHead><TableHead className="text-xs h-9 text-right">Ação</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {allInstallments.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">Nenhuma parcela</TableCell></TableRow>
                      ) : allInstallments.map((inst) => (
                        <TableRow key={inst.id}>
                          <TableCell className="text-sm py-2">{formatDate(inst.dueDate)}</TableCell>
                          <TableCell className="text-sm py-2 font-medium">{formatCurrency(inst.value)}</TableCell>
                          <TableCell className="text-sm py-2 text-muted-foreground">{formatCurrency(inst.transactionFee)}</TableCell>
                          <TableCell className="py-2">{statusBadge(inst.status)}</TableCell>
                          <TableCell className="text-right py-2">
                            {(inst.status === "pending" || inst.status === "overdue") && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" onClick={() => quickPayInstallment(inst.id, inst.contractId)}>
                                <Check className="h-3 w-3 mr-1" />Baixar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="comissoes" className="mt-0 px-5 pb-4">
                <div className="rounded-lg border border-border/30 overflow-hidden mt-3">
                  <Table>
                    <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-xs h-9">Beneficiário</TableHead><TableHead className="text-xs h-9">%</TableHead><TableHead className="text-xs h-9">Valor</TableHead><TableHead className="text-xs h-9">Status</TableHead><TableHead className="text-xs h-9 text-right">Ação</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {allCommissions.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">Nenhuma comissão</TableCell></TableRow>
                      ) : allCommissions.map((comm) => (
                        <TableRow key={comm.id}>
                          <TableCell className="text-sm py-2 font-medium">{comm.employeeName}</TableCell>
                          <TableCell className="text-sm py-2 text-muted-foreground">{comm.percentage}%</TableCell>
                          <TableCell className="text-sm py-2">{formatCurrency(comm.value)}</TableCell>
                          <TableCell className="py-2">{statusBadge(comm.status)}</TableCell>
                          <TableCell className="text-right py-2">
                            {comm.status === "pending" && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" onClick={() => quickPayCommission(comm.id, comm.contractId)}>
                                <Check className="h-3 w-3 mr-1" />Pagar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
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

      {/* Top-level Tabs */}
      <Tabs value={topTab} onValueChange={setTopTab} className="w-full">
        <TabsList className="h-11 bg-muted/50 p-1 w-fit">
          <TabsTrigger value="contratos" className="px-5 py-2 text-sm font-medium data-[state=active]:bg-[#E8BD27] data-[state=active]:text-black data-[state=active]:shadow-md transition-all">
            <FileText className="h-4 w-4 mr-2" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="cobrancas" className="px-5 py-2 text-sm font-medium data-[state=active]:bg-[#E8BD27] data-[state=active]:text-black data-[state=active]:shadow-md transition-all">
            <CircleDollarSign className="h-4 w-4 mr-2" />
            Cobranças
            {cobrancasKpis.overdueCount > 0 && (
              <span className="ml-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                {cobrancasKpis.overdueCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===== Contratos Tab ===== */}
        <TabsContent value="contratos" className="mt-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-[#E8BD27]/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-[#E8BD27]" /></div><div><p className="text-xs text-muted-foreground">Contratos Ativos</p><p className="text-lg font-bold">{formatCurrency(kpis.totalActive)}</p></div></div></CardContent></Card>
            <Card className="border-border/50"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CircleDollarSign className="h-5 w-5 text-emerald-500" /></div><div><p className="text-xs text-muted-foreground">Total Recebido</p><p className="text-lg font-bold text-emerald-500">{formatCurrency(kpis.totalReceived)}</p></div></div></CardContent></Card>
            <Card className="border-border/50"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-500" /></div><div><p className="text-xs text-muted-foreground">Total Pendente</p><p className="text-lg font-bold text-amber-500">{formatCurrency(kpis.totalPending)}</p></div></div></CardContent></Card>
            <Card className="border-border/50"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-blue-500" /></div><div><p className="text-xs text-muted-foreground">Concluídos</p><p className="text-lg font-bold">{kpis.completedCount}</p></div></div></CardContent></Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-card" />
            </div>
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
              {(["all", "active", "completed"] as const).map((f) => (
                <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Concluídos"}
                </button>
              ))}
            </div>
          </div>

          {/* Client List */}
          {dataLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
              <Users className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
              <Button variant="link" className="text-[#E8BD27]" onClick={() => setIsClientSelectorOpen(true)}>Criar contrato agora</Button>
            </div>
          ) : (
            <div className="space-y-3">{filteredClients.map(renderClientCard)}</div>
          )}
        </TabsContent>

        {/* ===== Cobranças Tab ===== */}
        <TabsContent value="cobrancas" className="mt-6 space-y-6">
          {/* Month Filter */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[220px] bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mini KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <CircleDollarSign className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total a Cobrar</p>
                    <p className="text-lg font-bold">{formatCurrency(cobrancasKpis.totalCobrar)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clientes</p>
                    <p className="text-lg font-bold">{cobrancasKpis.totalClientes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 border-destructive/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Parcelas Vencidas</p>
                    <p className="text-lg font-bold text-destructive">{cobrancasKpis.overdueCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cobranças List */}
          {dataLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : cobrancasData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
              <CheckCircle2 className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Nenhuma cobrança pendente</h3>
              <p className="text-sm">Todas as parcelas de {formatMonthLabel(selectedMonth)} estão pagas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cobrancasData.map((client) => (
                <div
                  key={client.clientId}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    client.hasOverdue
                      ? "border-l-4 border-l-destructive border-t-border/50 border-r-border/50 border-b-border/50"
                      : "border-l-4 border-l-amber-500 border-t-border/50 border-r-border/50 border-b-border/50"
                  } bg-card`}
                >
                  {/* Client header */}
                  <div className="flex items-center gap-4 p-4 pb-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={client.avatarUrl || undefined} />
                      <AvatarFallback className={`font-semibold text-sm ${client.hasOverdue ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500"}`}>
                        {getInitials(client.clientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{client.clientName}</span>
                        {client.hasOverdue && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 py-0">
                            Vencido
                          </Badge>
                        )}
                      </div>
                      {client.school && <p className="text-xs text-muted-foreground">{client.school}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{client.installments.length} parcela{client.installments.length > 1 ? "s" : ""}</p>
                      <p className="font-bold text-sm">{formatCurrency(client.totalPending)}</p>
                    </div>
                  </div>

                  {/* Installments inline */}
                  <div className="px-4 pb-4 space-y-2">
                    {client.installments
                      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                      .map((inst) => (
                        <div
                          key={inst.id}
                          className={`flex items-center gap-3 rounded-lg p-3 text-sm ${
                            inst.isOverdue
                              ? "bg-destructive/5 border border-destructive/20"
                              : "bg-muted/30 border border-border/30"
                          }`}
                        >
                          <span className={`font-medium min-w-[90px] ${inst.isOverdue ? "text-destructive" : "text-foreground"}`}>
                            {formatDate(inst.dueDate)}
                          </span>
                          <span className="font-semibold flex-1">{formatCurrency(inst.value)}</span>
                          {statusBadge(inst.status)}
                          <Button
                            size="sm"
                            variant={inst.isOverdue ? "destructive" : "default"}
                            className={`h-7 text-xs ${
                              inst.isOverdue
                                ? ""
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                            onClick={() => openPaymentModal({ id: inst.id, value: inst.value, dueDate: inst.dueDate, contractId: inst.contractId }, client.clientName)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Baixar
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ClientSelectorDialog
        open={isClientSelectorOpen}
        onOpenChange={setIsClientSelectorOpen}
        onSelectClient={handleSelectClient}
        onCreateNewClient={() => { setIsClientSelectorOpen(false); setIsNewClientDialogOpen(true); }}
      />
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader><DialogTitle>Novo Atleta</DialogTitle></DialogHeader>
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
              onCancel={() => { setIsContractModalOpen(false); setSelectedClient(null); }}
            />
          </div>
        </DialogContent>
      </Dialog>
      <ContractDetailDialog contractId={selectedContractId} open={isDetailOpen} onOpenChange={setIsDetailOpen} onContractUpdated={refreshAll} />
      <PaymentConfirmDialog
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        installment={paymentInstallment}
        clientName={paymentClientName}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}
