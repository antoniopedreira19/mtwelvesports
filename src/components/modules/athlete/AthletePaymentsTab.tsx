import { useAthletePayments, AthleteInstallment } from "@/hooks/useAthletePayments";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  CircleDollarSign,
  TrendingUp,
  Calendar,
  Receipt,
} from "lucide-react";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
  return format(d, "dd/MM/yyyy", { locale: ptBR });
};

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  paid: { label: "Pago", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  pending: { label: "Pendente", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  overdue: { label: "Vencido", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  cancelled: { label: "Cancelado", icon: Ban, color: "text-white/30", bg: "bg-white/5", border: "border-white/10" },
};

function PaymentKPIs({ installments }: { installments: AthleteInstallment[] }) {
  const total = installments.reduce((s, i) => s + i.value, 0);
  const paid = installments.filter((i) => i.status === "paid").reduce((s, i) => s + i.value, 0);
  const pending = installments.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + i.value, 0);
  const paidCount = installments.filter((i) => i.status === "paid").length;

  const kpis = [
    { label: "Total do Contrato", value: formatCurrency(total), icon: CircleDollarSign, color: "text-[#E8BD27]", bg: "bg-[#E8BD27]/10" },
    { label: "Pago", value: formatCurrency(paid), icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Pendente", value: formatCurrency(pending), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Parcelas Pagas", value: `${paidCount}/${installments.length}`, icon: TrendingUp, color: "text-[#E8BD27]", bg: "bg-[#E8BD27]/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="bg-[#141414] border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className={`${kpi.bg} rounded-xl p-2.5`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-base font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function InstallmentRow({ inst }: { inst: AthleteInstallment }) {
  const cfg = statusConfig[inst.status] || statusConfig.pending;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
      {/* Index */}
      <div className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-white/40">
          {inst.installmentIndex}/{inst.totalInstallments}
        </span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Calendar className="h-3.5 w-3.5 text-white/20 shrink-0" />
        <span className="text-sm text-white/70">{formatDate(inst.paymentDate)}</span>
      </div>

      {/* Value */}
      <div className="text-right shrink-0">
        <span className="text-sm font-semibold text-white">{formatCurrency(inst.value)}</span>
      </div>

      {/* Status Badge */}
      <Badge variant="outline" className={`${cfg.bg} ${cfg.color} ${cfg.border} text-[11px] px-2 py-0.5 gap-1 shrink-0`}>
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    </div>
  );
}

export function AthletePaymentsTab() {
  const { data: installments, isLoading } = useAthletePayments();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}
        </div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl bg-white/5" />)}
      </div>
    );
  }

  if (!installments || installments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#E8BD27]/10 flex items-center justify-center">
          <Receipt className="w-8 h-8 text-[#E8BD27]" />
        </div>
        <h2 className="text-xl font-bold text-white">Nenhum pagamento encontrado</h2>
        <p className="text-white/50 max-w-md">
          Quando seu contrato estiver ativo, suas parcelas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PaymentKPIs installments={installments} />

      <Card className="bg-[#141414] border-white/5 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-[#E8BD27]" />
          <h3 className="text-sm font-semibold text-white">Parcelas</h3>
          <span className="text-xs text-white/30 ml-auto">{installments.length} parcelas</span>
        </div>

        {/* List */}
        <div className="divide-y divide-white/5">
          {installments.map((inst) => (
            <InstallmentRow key={inst.id} inst={inst} />
          ))}
        </div>
      </Card>
    </div>
  );
}
