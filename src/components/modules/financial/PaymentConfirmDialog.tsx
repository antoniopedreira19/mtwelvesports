import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, CircleDollarSign, Receipt, ArrowRight, Loader2 } from "lucide-react";

interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: {
    id: string;
    value: number;
    dueDate: string;
    contractId: string;
    transactionFee?: number;
  } | null;
  clientName?: string;
  onConfirm: (data: {
    installmentId: string;
    contractId: string;
    paidValue: number;
    transactionFee: number;
  }) => Promise<void>;
}

export function PaymentConfirmDialog({
  open,
  onOpenChange,
  installment,
  clientName,
  onConfirm,
}: PaymentConfirmDialogProps) {
  const [paidValue, setPaidValue] = useState("");
  const [transactionFee, setTransactionFee] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (installment && open) {
      setPaidValue(String(installment.value));
      setTransactionFee(String(installment.transactionFee || 0));
    }
  }, [installment, open]);

  const paidNum = parseFloat(paidValue) || 0;
  const feeNum = parseFloat(transactionFee) || 0;
  const netValue = Math.max(0, paidNum - feeNum);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR");
  };

  const handleConfirm = async () => {
    if (!installment || paidNum <= 0) return;
    setIsLoading(true);
    try {
      await onConfirm({
        installmentId: installment.id,
        contractId: installment.contractId,
        paidValue: paidNum,
        transactionFee: feeNum,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!installment) return null;

  const valueChanged = paidNum !== installment.value;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-card border-border p-0 gap-0 overflow-hidden">
        {/* Header accent */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-[#E8BD27]" />

        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-lg flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CircleDollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            Confirmar Recebimento
          </DialogTitle>
          {clientName && (
            <p className="text-sm text-muted-foreground mt-1">{clientName}</p>
          )}
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Original info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/30">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Vencimento</p>
              <p className="text-sm font-semibold mt-0.5">{formatDate(installment.dueDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Valor Original</p>
              <p className="text-sm font-semibold mt-0.5">{formatCurrency(installment.value)}</p>
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paid-value" className="text-sm font-medium flex items-center gap-2">
                <CircleDollarSign className="h-3.5 w-3.5 text-emerald-500" />
                Valor Recebido
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                <Input
                  id="paid-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidValue}
                  onChange={(e) => setPaidValue(e.target.value)}
                  className="pl-10 h-11 text-base font-semibold bg-background"
                  placeholder="0,00"
                />
              </div>
              {valueChanged && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <ArrowRight className="h-3 w-3" />
                  <span>Diferente do valor original ({formatCurrency(installment.value)})</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-fee" className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                Taxa de Transação
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                <Input
                  id="transaction-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={transactionFee}
                  onChange={(e) => setTransactionFee(e.target.value)}
                  className="pl-10 h-11 bg-background"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* Summary */}
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Recebido</span>
              <span className="font-medium">{formatCurrency(paidNum)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxa</span>
              <span className="font-medium text-destructive">- {formatCurrency(feeNum)}</span>
            </div>
            <Separator className="bg-emerald-500/20" />
            <div className="flex justify-between">
              <span className="text-sm font-semibold">Valor Líquido</span>
              <span className="text-lg font-bold text-emerald-500">{formatCurrency(netValue)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/30 bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || paidNum <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Confirmar Baixa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
