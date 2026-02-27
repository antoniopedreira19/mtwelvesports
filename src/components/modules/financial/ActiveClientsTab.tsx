import { useState } from "react";
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

  const activeContracts = client.contracts.filter((c) => c.status === "active");
  const completedContracts = client.contracts.filter((c) => c.status === "completed");

  return (
    <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 border-border/50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-5 flex items-center gap-4 text-left hover:bg-muted/30 rounded-t-2xl transition-colors">
            <Avatar className="h-12 w-12 ring-2 ring-border">
              <AvatarImage src={client.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">{client.clientName}</h3>
                {client.hasActive && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20">
                    Ativo
                  </Badge>
                )}
                {client.hasCompleted && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    Concluído
                  </Badge>
                )}
              </div>
              {client.school && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {client.school}
                </p>
              )}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{formatCurrency(client.totalValue)}</p>
              <p className="text-xs text-muted-foreground">Valor total</p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-5">
            {/* Contract Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3.5 text-center">
                <DollarSign className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(client.totalPaid)}</p>
                <p className="text-xs text-emerald-600/80">Pago</p>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-3.5 text-center">
                <Clock className="h-4 w-4 mx-auto text-amber-600 mb-1" />
                <p className="text-lg font-bold text-amber-700">{formatCurrency(client.totalPending)}</p>
                <p className="text-xs text-amber-600/80">Pendente</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3.5 text-center">
                <CheckCircle2 className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold text-primary">
                  {activeContracts.length + completedContracts.length}
                </p>
                <p className="text-xs text-primary/80">Contratos</p>
              </div>
            </div>

            {/* Payer Data */}
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Dados do Pagador
                </h4>
                {!editing ? (
                  <Button variant="ghost" size="sm" onClick={startEdit} className="h-7 text-xs gap-1">
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveMutation.mutate(form)}
                      disabled={saveMutation.isPending}
                      className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700"
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

              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Nome do Pagador</label>
                    <Input
                      value={form.payer_name}
                      onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
                      placeholder="Nome completo"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <Input
                      value={form.payer_email}
                      onChange={(e) => setForm({ ...form, payer_email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Telefone</label>
                    <Input
                      value={form.payer_phone}
                      onChange={(e) => setForm({ ...form, payer_phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Quem paga?</label>
                    <Select
                      value={form.payer_relationship}
                      onValueChange={(v) => setForm({ ...form, payer_relationship: v })}
                    >
                      <SelectTrigger className="h-8 text-sm">
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
                    <label className="text-xs text-muted-foreground">Método de Pagamento</label>
                    <Select
                      value={form.payment_method}
                      onValueChange={(v) => setForm({ ...form, payment_method: v })}
                    >
                      <SelectTrigger className="h-8 text-sm">
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{payerData?.payer_name || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{payerData?.payer_email || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{payerData?.payer_phone || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{relationshipLabels[payerData?.payer_relationship || "self"]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>
                      {payerData?.payment_method
                        ? paymentMethodLabels[payerData.payment_method] || payerData.payment_method
                        : "Não informado"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Contracts detail */}
            {client.contracts.length > 0 && (
              <div className="rounded-xl border border-border/50 p-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Contratos
                </h4>
                <div className="space-y-2">
                  {client.contracts.map((contract) => {
                    const paid = contract.installments.filter((i) => i.status === "paid").length;
                    const total = contract.installments.length;
                    return (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              contract.status === "active"
                                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {contract.status === "active" ? "Ativo" : "Concluído"}
                          </Badge>
                          <span className="text-muted-foreground">
                            Venc. dia {contract.dueDay}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            {paid}/{total} parcelas
                          </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(contract.totalValue)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Documents placeholder */}
            <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Documentos</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Em breve: upload de contratos e documentos
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function ActiveClientsTab() {
  const { data: clients, isLoading } = useClientContracts();
  const clientIds = (clients || []).map((c) => c.clientId);
  const { data: payerMap } = usePayerData(clientIds);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Nenhum cliente com contrato ativo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        {clients.length} cliente{clients.length !== 1 ? "s" : ""} com contratos ativos ou concluídos
      </p>
      {clients.map((client) => (
        <ClientCard key={client.clientId} client={client} payerData={payerMap?.[client.clientId]} />
      ))}
    </div>
  );
}
