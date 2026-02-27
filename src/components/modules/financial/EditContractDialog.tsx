import { useState, useEffect } from "react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Wand2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useEmployees } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InstallmentEdit {
  id?: string;
  value: number;
  payment_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  transaction_fee: number;
}

interface CommissionEdit {
  id?: string;
  employee_name: string;
  percentage: number;
  value: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  installment_id?: string | null;
}

interface EditContractDialogProps {
  contractId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractUpdated?: () => void;
}

export function EditContractDialog({
  contractId,
  open,
  onOpenChange,
  onContractUpdated,
}: EditContractDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [contract, setContract] = useState<any>(null);
  const [clientName, setClientName] = useState("");

  const [totalValue, setTotalValue] = useState<string>("");
  const [installmentsCount, setInstallmentsCount] = useState<string>("1");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [defaultFee, setDefaultFee] = useState<string>("0");
  const [dueDay, setDueDay] = useState<string>("20");

  const [installments, setInstallments] = useState<InstallmentEdit[]>([]);
  const [commissions, setCommissions] = useState<CommissionEdit[]>([]);

  const [originalInstallmentIds, setOriginalInstallmentIds] = useState<string[]>([]);
  const [originalCommissionIds, setOriginalCommissionIds] = useState<string[]>([]);

  const { data: employees } = useEmployees();

  const noSpinnerClass =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  useEffect(() => {
    if (contractId && open) {
      fetchContractData();
    }
  }, [contractId, open]);

  async function fetchContractData() {
    setIsLoading(true);
    try {
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select(`*, clients (name)`)
        .eq("id", contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);
      setClientName(contractData.clients?.name || "Cliente");
      setTotalValue(String(contractData.total_value));
      setDueDay(String(contractData.due_day || 20));

      const { data: instData, error: instError } = await supabase
        .from("installments")
        .select("*")
        .eq("contract_id", contractId)
        .order("payment_date", { ascending: true });

      if (instError) throw instError;

      const mappedInstallments: InstallmentEdit[] = (instData || []).map((i) => ({
        id: i.id,
        value: Number(i.value),
        payment_date: i.payment_date,
        status: i.status as InstallmentEdit["status"],
        transaction_fee: Number(i.transaction_fee || 0),
      }));
      setInstallments(mappedInstallments);
      setOriginalInstallmentIds(mappedInstallments.map((i) => i.id!));
      setInstallmentsCount(String(mappedInstallments.length));

      if (mappedInstallments.length > 0) {
        setStartDate(new Date(mappedInstallments[0].payment_date + "T12:00:00"));
        setDefaultFee(String(mappedInstallments[0].transaction_fee));
      }

      const { data: commData, error: commError } = await supabase
        .from("commissions")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true });

      if (commError) throw commError;

      const uniqueCommissions = new Map<string, CommissionEdit>();
      (commData || []).forEach((c) => {
        if (!uniqueCommissions.has(c.employee_name)) {
          uniqueCommissions.set(c.employee_name, {
            id: c.id,
            employee_name: c.employee_name,
            percentage: Number(c.percentage),
            value: Number(c.value),
            status: c.status as CommissionEdit["status"],
            installment_id: c.installment_id,
          });
        }
      });
      setCommissions(Array.from(uniqueCommissions.values()));
      setOriginalCommissionIds((commData || []).map((c) => c.id));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar contrato.");
    } finally {
      setIsLoading(false);
    }
  }

  const calculateNetTotal = () => {
    let totalTax = 0;
    if (installments.length > 0) {
      totalTax = installments.reduce((acc, curr) => acc + (curr.transaction_fee || 0), 0);
    } else {
      totalTax = Number(defaultFee) * Number(installmentsCount);
    }

    const gross = Number(totalValue) || 0;
    return Math.max(0, gross - totalTax);
  };

  const netTotal = calculateNetTotal();

  const generateInstallments = () => {
    const value = Number(totalValue);
    const count = Number(installmentsCount);
    const fee = Number(defaultFee);

    if (!value || !count) return;

    const installmentValue = value / count;
    const newInstallments: InstallmentEdit[] = Array.from({ length: count }).map((_, index) => ({
      value: Number(installmentValue.toFixed(2)),
      payment_date: format(addMonths(startDate, index), "yyyy-MM-dd"),
      status: "pending" as const,
      transaction_fee: fee,
    }));

    const currentSum = newInstallments.reduce((acc, curr) => acc + curr.value, 0);
    const diff = value - currentSum;
    if (diff !== 0) {
      newInstallments[newInstallments.length - 1].value += diff;
    }

    setInstallments(newInstallments);
  };

  const updateInstallment = (index: number, field: keyof InstallmentEdit, value: any) => {
    const newInstallments = [...installments];
    newInstallments[index] = { ...newInstallments[index], [field]: value };
    setInstallments(newInstallments);

    if (field === "value") {
      const newTotal = newInstallments.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
      setTotalValue(newTotal.toFixed(2));
    }
  };

  const addCommission = () => {
    setCommissions([
      ...commissions,
      { employee_name: "", percentage: 0, value: 0, status: "pending" },
    ]);
  };

  const updateCommission = (index: number, field: keyof CommissionEdit, value: any) => {
    const newCommissions = [...commissions];
    newCommissions[index] = { ...newCommissions[index], [field]: value };
    setCommissions(newCommissions);
  };

  const removeCommission = (index: number) => {
    setCommissions(commissions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!contractId) return;

    setIsSaving(true);
    try {
      const newTotalValue = Number(totalValue);
      const newDueDay = Math.min(31, Math.max(1, Number(dueDay) || 20));

      // 1. Atualizar contrato
      const { error: contractError } = await supabase
        .from("contracts")
        .update({ total_value: newTotalValue, due_day: newDueDay, updated_at: new Date().toISOString() })
        .eq("id", contractId);

      if (contractError) throw contractError;

      // 2. Deletar parcelas antigas
      if (originalInstallmentIds.length > 0) {
        await supabase.from("installments").delete().in("id", originalInstallmentIds);
      }

      // 3. Deletar comissões antigas
      if (originalCommissionIds.length > 0) {
        await supabase.from("commissions").delete().in("id", originalCommissionIds);
      }

      // 4. Inserir novas parcelas
      if (installments.length > 0) {
        const installmentsData = installments.map((inst) => ({
          contract_id: contractId,
          value: inst.value,
          payment_date: inst.payment_date,
          status: inst.status || "pending",
          transaction_fee: inst.transaction_fee || 0,
        }));

        const { error: installmentsError } = await supabase
          .from("installments")
          .insert(installmentsData);

        if (installmentsError) throw installmentsError;
      }

      // 5. Buscar IDs das parcelas criadas
      const { data: createdInstallments, error: fetchInstError } = await supabase
        .from("installments")
        .select("id, value, transaction_fee")
        .eq("contract_id", contractId);

      if (fetchInstError) throw fetchInstError;

      // 6. Inserir comissões
      if (commissions.length > 0 && createdInstallments) {
        const validCommissions = commissions.filter((c) => c.employee_name && c.percentage > 0);

        const commissionsData = validCommissions.flatMap((comm) =>
          createdInstallments.map((inst) => {
            const grossValue = Number(inst.value);
            const fee = Number(inst.transaction_fee || 0);
            const netValue = Math.max(0, grossValue - fee);

            return {
              contract_id: contractId,
              installment_id: inst.id,
              employee_name: comm.employee_name,
              percentage: comm.percentage,
              value: (netValue * comm.percentage) / 100,
              status: "pending" as const,
            };
          })
        );

        if (commissionsData.length > 0) {
          const { error: commissionsError } = await supabase
            .from("commissions")
            .insert(commissionsData);

          if (commissionsError) throw commissionsError;
        }
      }

      toast.success("Contrato atualizado com sucesso!");
      onOpenChange(false);
      if (onContractUpdated) onContractUpdated();
    } catch (error) {
      console.error("Erro ao atualizar contrato:", error);
      toast.error("Erro ao atualizar contrato.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border p-0 gap-0">
        <DialogHeader className="p-6 pb-2 border-b border-border/50">
          <DialogTitle className="text-xl flex items-center gap-2">
            <span className="w-1 h-6 bg-[#E8BD27] rounded-full inline-block"></span>
            Editar Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted" />
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {/* Cliente */}
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold text-lg">{clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className="text-[#E8BD27] font-medium text-sm">Editando Contrato</span>
                </div>
              </div>

              {/* GRID DE CONFIGURAÇÃO */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    className={`text-lg font-medium ${noSpinnerClass}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Qtd. Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    className={noSpinnerClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa Padrão (R$)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={defaultFee}
                      onChange={(e) => setDefaultFee(e.target.value)}
                      className={noSpinnerClass}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">R$</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data 1ª Parcela</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? (
                          format(startDate, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Dia de Vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    placeholder="20"
                    className={noSpinnerClass}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={generateInstallments} variant="secondary" className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  Gerar Novas Parcelas
                </Button>
              </div>

              <Separator />

              {/* LISTA DE PARCELAS */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    Parcelamento
                  </h3>
                </div>

                {installments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    Configure os valores acima e clique em "Gerar Novas Parcelas"
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-12 gap-4 px-3 text-xs font-medium text-muted-foreground uppercase">
                      <div className="col-span-1">#</div>
                      <div className="col-span-4">Data Pagamento</div>
                      <div className="col-span-4">Valor (R$)</div>
                      <div className="col-span-3 text-right">Taxa (R$)</div>
                    </div>

                    {installments.map((inst, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-4 items-center p-3 bg-card border rounded-lg hover:border-primary/30 transition-colors"
                      >
                        <div className="col-span-1 text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </div>
                        <div className="col-span-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal h-9"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {inst.payment_date ? (
                                  format(new Date(inst.payment_date + "T12:00:00"), "dd/MM/yy")
                                ) : (
                                  <span>Data</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={new Date(inst.payment_date + "T12:00:00")}
                                onSelect={(date) =>
                                  date && updateInstallment(index, "payment_date", format(date, "yyyy-MM-dd"))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="col-span-4">
                          <Input
                            type="number"
                            value={inst.value}
                            onChange={(e) => updateInstallment(index, "value", Number(e.target.value))}
                            className={`font-medium h-9 ${noSpinnerClass}`}
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="relative">
                            <Input
                              type="number"
                              value={inst.transaction_fee}
                              onChange={(e) =>
                                updateInstallment(index, "transaction_fee", Number(e.target.value))
                              }
                              className={`h-9 text-right pr-2 text-red-400 ${noSpinnerClass}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end mt-2 text-sm text-muted-foreground gap-4">
                      <span>
                        Total Taxas:{" "}
                        <span className="text-red-400">
                          {formatCurrency(installments.reduce((a, b) => a + (b.transaction_fee || 0), 0))}
                        </span>
                      </span>
                      <span>
                        Total Parcelado:{" "}
                        <span className="font-bold text-foreground">
                          {formatCurrency(installments.reduce((a, b) => a + b.value, 0))}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* COMISSÕES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    Comissões & Parceiros
                  </h3>
                  <Button onClick={addCommission} variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>

                {commissions.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">
                    Nenhuma comissão configurada para este contrato.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commissions.map((comm, index) => (
                      <div
                        key={index}
                        className="flex gap-4 items-end bg-muted/20 p-3 rounded-lg border"
                      >
                        <div className="flex-1 space-y-2">
                          <Label>Beneficiário</Label>
                          <Select
                            value={comm.employee_name}
                            onValueChange={(val) => updateCommission(index, "employee_name", val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {employees?.map((emp) => (
                                <SelectItem key={emp.id} value={emp.name}>
                                  {emp.name} ({emp.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32 space-y-2">
                          <Label>% Comissão</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={comm.percentage}
                              onChange={(e) =>
                                updateCommission(index, "percentage", Number(e.target.value))
                              }
                              className={`pr-6 ${noSpinnerClass}`}
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                              %
                            </span>
                          </div>
                        </div>
                        <div className="w-40 space-y-2">
                          <Label>Valor Estimado</Label>
                          <div className="h-10 px-3 py-2 bg-muted rounded-md text-sm font-medium flex items-center text-muted-foreground border">
                            R$ {((netTotal * comm.percentage) / 100).toFixed(2)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mb-0.5 text-muted-foreground hover:text-red-500"
                          onClick={() => removeCommission(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="gold-gradient text-primary-foreground font-bold min-w-[150px]"
                  disabled={!totalValue || installments.length === 0 || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
