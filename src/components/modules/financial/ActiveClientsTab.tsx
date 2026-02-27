import { useState, useMemo } from "react";
import { useClientContracts, ClientContractData } from "@/hooks/useClientContracts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ChevronDown,
  User,
  Mail,
  Phone,
  CreditCard,
  FileText,
  Pencil,
  Check,
  X,
  GraduationCap,
  DollarSign,
  Clock,
  CheckCircle2,
  Upload,
  Search,
  TrendingUp,
  AlertCircle,
  Users,
  Calendar,
  ExternalLink,
} from "lucide-react";

interface PayerData {
  payer_name: string | null;
  payer_email: string | null;
  payer_phone: string | null;
  payer_relationship: string | null;
  payment_method: string | null;
}

function usePayerData(clientIds: string[]) {
  return useQuery({
    queryKey: ["payer-data", clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return {};
      const { data, error } = await supabase
        .from("clients")
        .select("id, payer_name, payer_email, payer_phone, payer_relationship, payment_method")
        .in("id", clientIds);
      if (error) throw error;
      const map: Record<string, PayerData> = {};
      for (const c of data || []) {
        map[c.id] = {
          payer_name: c.payer_name,
          payer_email: c.payer_email,
          payer_phone: c.payer_phone,
          payer_relationship: c.payer_relationship,
          payment_method: c.payment_method,
        };
      }
      return map;
    },
    enabled: clientIds.length > 0,
  });
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const relationshipLabels: Record<string, string> = {
  self: "Ele mesmo",
  parent: "Pai/Mãe",
  guardian: "Responsável",
  other: "Outro",
};

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX",
  transfer: "Transferência",
  credit_card: "Cartão de Crédito",
  boleto: "Boleto",
};

/* ─── Summary KPI Cards ─── */
function SummaryCards({ clients }: { clients: ClientContractData[] }) {
  const totalValue = clients.reduce((s, c) => s + c.totalValue, 0);
  const totalPaid = clients.reduce((s, c) => s + c.totalPaid, 0);
  const totalPending = clients.reduce((s, c) => s + c.totalPending, 0);
  const activeCount = clients.filter((c) => c.hasActive).length;

  const kpis = [
    {
      label: "Clientes Ativos",
      value: activeCount.toString(),
      icon: Users,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Valor Total",
      value: formatCurrency(totalValue),
      icon: TrendingUp,
      accent: "text-foreground",
      bg: "bg-muted/50",
    },
    {
      label: "Recebido",
      value: formatCurrency(totalPaid),
      icon: CheckCircle2,
      accent: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Pendente",
      value: formatCurrency(totalPending),
      icon: Clock,
      accent: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-border/30 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`${kpi.bg} rounded-xl p-2.5`}>
              <kpi.icon className={`h-5 w-5 ${kpi.accent}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.accent} truncate`}>{kpi.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Client Card ─── */
function ClientCard({
  client,
  payerData,
}: {
  client: ClientContractData;
  payerData: PayerData | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    payer_name: payerData?.payer_name || "",
    payer_email: payerData?.payer_email || "",
    payer_phone: payerData?.payer_phone || "",
    payer_relationship: payerData?.payer_relationship || "self",
    payment_method: payerData?.payment_method || "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { error } = await supabase
        .from("clients")
        .update({
          payer_name: data.payer_name || null,
          payer_email: data.payer_email || null,
          payer_phone: data.payer_phone || null,
          payer_relationship: data.payer_relationship || "self",
          payment_method: data.payment_method || null,
        })
        .eq("id", client.clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payer-data"] });
      toast.success("Dados do pagador atualizados");
      setEditing(false);
    },
    onError: () => toast.error("Erro ao salvar dados"),
  });

  const startEdit = () => {
    setForm({
      payer_name: payerData?.payer_name || "",
      payer_email: payerData?.payer_email || "",
      payer_phone: payerData?.payer_phone || "",
      payer_relationship: payerData?.payer_relationship || "self",
      payment_method: payerData?.payment_method || "",
    });
    setEditing(true);
  };

  const initials = client.clientName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const paymentProgress = client.totalValue > 0 ? (client.totalPaid / client.totalValue) * 100 : 0;

  const allInstallments = client.contracts.flatMap((c) => c.installments);
  const overdueCount = allInstallments.filter(
    (i) => i.status === "pending" && new Date(i.paymentDate) < new Date()
  ).length;

  const hasPayerInfo = payerData?.payer_name || payerData?.payer_email || payerData?.payer_phone;

  return (
    <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-border/60 group">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-5 flex items-center gap-4 text-left transition-colors">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all">
                <AvatarImage src={client.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {overdueCount > 0 && (
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
                  <span className="text-[10px] font-bold text-destructive-foreground">{overdueCount}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-semibold text-foreground text-base">{client.clientName}</h3>
                {client.hasActive && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[11px] px-2 py-0">
                    Ativo
                  </Badge>
                )}
                {client.hasCompleted && !client.hasActive && (
                  <Badge variant="secondary" className="text-[11px] px-2 py-0">
                    Concluído
                  </Badge>
                )}
                {overdueCount > 0 && (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/25 text-[11px] px-2 py-0">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {overdueCount} em atraso
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {client.school && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {client.school}
                  </span>
                )}
                {payerData?.payment_method && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    {paymentMethodLabels[payerData.payment_method]}
                  </span>
                )}
              </div>
            </div>

            {/* Progress + Value */}
            <div className="hidden md:flex items-center gap-5">
              <div className="w-32">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">{Math.round(paymentProgress)}%</span>
                  <span className="text-foreground font-medium">{formatCurrency(client.totalPaid)}</span>
                </div>
                <Progress value={paymentProgress} className="h-1.5 bg-muted/50" />
              </div>
              <div className="text-right min-w-[100px]">
                <p className="text-base font-bold text-foreground">{formatCurrency(client.totalValue)}</p>
                <p className="text-[11px] text-muted-foreground">Valor total</p>
              </div>
            </div>

            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/20">
            <CardContent className="p-5 space-y-5">
              {/* Mobile values */}
              <div className="md:hidden">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">{Math.round(paymentProgress)}% pago</span>
                  <span className="text-foreground font-medium">{formatCurrency(client.totalValue)}</span>
                </div>
                <Progress value={paymentProgress} className="h-1.5 bg-muted/50" />
              </div>

              {/* Financial Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[11px] text-emerald-400/80 uppercase tracking-wider font-medium">Recebido</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(client.totalPaid)}</p>
                </div>
                <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] text-amber-400/80 uppercase tracking-wider font-medium">Pendente</span>
                  </div>
                  <p className="text-lg font-bold text-amber-400">{formatCurrency(client.totalPending)}</p>
                </div>
                <div className="rounded-xl bg-muted/30 border border-border/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Contratos</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{client.contracts.length}</p>
                </div>
              </div>

              {/* Payer Data */}
              <div className="rounded-xl bg-muted/20 border border-border/30 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Pagador
                  </h4>
                  {!editing ? (
                    <Button variant="ghost" size="sm" onClick={startEdit} className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => saveMutation.mutate(form)}
                        disabled={saveMutation.isPending}
                        className="h-7 text-xs gap-1 text-emerald-500 hover:text-emerald-400"
                      >
                        <Check className="h-3 w-3" /> Salvar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(false)}
                        className="h-7 text-xs gap-1 text-muted-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Nome do Pagador</label>
                        <Input
                          value={form.payer_name}
                          onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
                          placeholder="Nome completo"
                          className="h-9 text-sm bg-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Email</label>
                        <Input
                          value={form.payer_email}
                          onChange={(e) => setForm({ ...form, payer_email: e.target.value })}
                          placeholder="email@exemplo.com"
                          className="h-9 text-sm bg-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Telefone</label>
                        <Input
                          value={form.payer_phone}
                          onChange={(e) => setForm({ ...form, payer_phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="h-9 text-sm bg-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Quem paga?</label>
                        <Select
                          value={form.payer_relationship}
                          onValueChange={(v) => setForm({ ...form, payer_relationship: v })}
                        >
                          <SelectTrigger className="h-9 text-sm bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="self">Ele mesmo</SelectItem>
                            <SelectItem value="parent">Pai/Mãe</SelectItem>
                            <SelectItem value="guardian">Responsável</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Método de Pagamento</label>
                        <Select
                          value={form.payment_method}
                          onValueChange={(v) => setForm({ ...form, payment_method: v })}
                        >
                          <SelectTrigger className="h-9 text-sm bg-background/50">
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="transfer">Transferência</SelectItem>
                            <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                            <SelectItem value="boleto">Boleto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : hasPayerInfo ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pagador</p>
                          <p className="text-sm text-foreground">{payerData?.payer_name || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
                          <p className="text-sm text-foreground">{payerData?.payer_email || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Telefone</p>
                          <p className="text-sm text-foreground">{payerData?.payer_phone || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Relação</p>
                          <p className="text-sm text-foreground">{relationshipLabels[payerData?.payer_relationship || "self"]}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pagamento</p>
                          <p className="text-sm text-foreground">
                            {payerData?.payment_method
                              ? paymentMethodLabels[payerData.payment_method]
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-2">Nenhum dado de pagador cadastrado</p>
                      <Button variant="outline" size="sm" onClick={startEdit} className="text-xs gap-1.5">
                        <Pencil className="h-3 w-3" /> Cadastrar Pagador
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Contracts */}
              {client.contracts.length > 0 && (
                <div className="rounded-xl bg-muted/20 border border-border/30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/20">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Contratos
                    </h4>
                  </div>
                  <div className="divide-y divide-border/15">
                    {client.contracts.map((contract) => {
                      const paid = contract.installments.filter((i) => i.status === "paid").length;
                      const total = contract.installments.length;
                      const progress = total > 0 ? (paid / total) * 100 : 0;
                      return (
                        <div key={contract.id} className="px-4 py-3 flex items-center gap-4">
                          <Badge
                            className={
                              contract.status === "active"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[11px]"
                                : "bg-muted text-muted-foreground border-border/30 text-[11px]"
                            }
                          >
                            {contract.status === "active" ? "Ativo" : "Concluído"}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Dia {contract.dueDay}
                          </div>
                          <div className="flex-1 hidden sm:block">
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-1 flex-1 bg-muted/50" />
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {paid}/{total}
                              </span>
                            </div>
                          </div>
                          <span className="font-semibold text-sm text-foreground">
                            {formatCurrency(contract.totalValue)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Portal placeholder */}
              <div className="rounded-xl border border-dashed border-border/30 bg-muted/10 p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ExternalLink className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Portal do Cliente</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Em breve: documentos, oportunidades de times/universidades e comunicação direta
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">Em breve</Badge>
              </div>
            </CardContent>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/* ─── Main Component ─── */
export function ActiveClientsTab() {
  const { data: clients, isLoading } = useClientContracts();
  const clientIds = (clients || []).map((c) => c.clientId);
  const { data: payerMap } = usePayerData(clientIds);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

  const filtered = useMemo(() => {
    if (!clients) return [];
    return clients.filter((c) => {
      const matchSearch =
        !search ||
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        (c.school && c.school.toLowerCase().includes(search.toLowerCase()));
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.hasActive) ||
        (statusFilter === "completed" && c.hasCompleted && !c.hasActive);
      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="text-foreground font-medium">Nenhum cliente ativo</p>
        <p className="text-sm text-muted-foreground mt-1">Clientes com contratos ativos aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <SummaryCards clients={clients} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou escola..."
            className="pl-9 h-10 bg-card/80 border-border/30"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-card/80 border-border/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({clients.length})</SelectItem>
            <SelectItem value="active">Ativos ({clients.filter((c) => c.hasActive).length})</SelectItem>
            <SelectItem value="completed">
              Concluídos ({clients.filter((c) => c.hasCompleted && !c.hasActive).length})
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          filtered.map((client) => (
            <ClientCard key={client.clientId} client={client} payerData={payerMap?.[client.clientId]} />
          ))
        )}
      </div>
    </div>
  );
}
