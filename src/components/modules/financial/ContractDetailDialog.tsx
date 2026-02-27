import { useEffect, useState, useMemo } from "react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  CircleDollarSign,
  FileText,
  Pencil,
  Plus,
  User,
  X,
  CalendarIcon,
  CheckCircle2,
  CalendarDays,
  Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { checkAndCompleteContract } from "@/services/contractService";
import { useEmployees } from "@/hooks/useEmployees";
import { EditContractDialog } from "./EditContractDialog";

interface ContractDetailDialogProps {
  contractId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractUpdated?: () => void;
}

export function ContractDetailDialog({ contractId, open, onOpenChange, onContractUpdated }: ContractDetailDialogProps) {
  const [contract, setContract] = useState<any>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Busca funcionários para o select de beneficiário
  const { data: employees = [] } = useEmployees();

  // Estados de Edição
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [editInstallmentForm, setEditInstallmentForm] = useState<any>({});

  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [editCommissionForm, setEditCommissionForm] = useState<any>({});

  useEffect(() => {
    if (contractId && open) {
      fetchContractDetails();
    }
  }, [contractId, open]);

  async function fetchContractDetails() {
    setIsLoading(true);
    try {
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select(`*, clients (name, school, email, phone)`)
        .eq("id", contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      const { data: instData, error: instError } = await supabase
        .from("installments")
        .select("*")
        .eq("contract_id", contractId)
        .order("due_date", { ascending: true });

      if (instError) throw instError;
      setInstallments(instData || []);

      const { data: commData, error: commError } = await supabase
        .from("commissions")
        .select(`*, installments (due_date)`)
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true });

      if (commError) throw commError;

      const sortedCommissions = (commData || []).sort((a: any, b: any) => {
        const dateA = a.installments?.due_date || a.created_at;
        const dateB = b.installments?.due_date || b.created_at;
        return dateA > dateB ? 1 : -1;
      });

      setCommissions(sortedCommissions);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar detalhes.");
    } finally {
      setIsLoading(false);
    }
  }

  const commissionsGroups = useMemo(() => {
    const groupsMap = new Map<string, { label: string; dateVal: number; items: any[] }>();

    commissions.forEach((comm) => {
      const dateStr = comm.installments?.due_date || comm.created_at || new Date().toISOString();
      const dateObj = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");

      const key = format(dateObj, "yyyy-MM");
      const label = format(dateObj, "MMMM yyyy", { locale: ptBR });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          label: capitalizedLabel,
          dateVal: dateObj.getTime(),
          items: [],
        });
      }
      groupsMap.get(key)!.items.push(comm);
    });

    return Array.from(groupsMap.values()).sort((a, b) => a.dateVal - b.dateVal);
  }, [commissions]);

  const quickPayInstallment = async (id: string) => {
    // Guarda estado anterior para rollback
    const previousInstallments = [...installments];
    
    // Optimistic update
    setInstallments((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, status: "paid" } : inst))
    );

    try {
      const { error } = await supabase.from("installments").update({ status: "paid" }).eq("id", id);
      if (error) throw error;

      // Verifica se o contrato foi concluído
      await checkAndCompleteContract(contractId!);

      toast.success("Parcela recebida!");
      if (onContractUpdated) onContractUpdated();
    } catch (e) {
      // Rollback em caso de erro
      setInstallments(previousInstallments);
      toast.error("Erro ao baixar parcela.");
    }
  };

  const quickPayCommission = async (id: string) => {
    // Guarda estado anterior para rollback
    const previousCommissions = [...commissions];
    
    // Optimistic update
    setCommissions((prev) =>
      prev.map((comm) => (comm.id === id ? { ...comm, status: "paid" } : comm))
    );

    try {
      const { error } = await supabase.from("commissions").update({ status: "paid" }).eq("id", id);
      if (error) throw error;

      // Verifica se o contrato foi concluído
      await checkAndCompleteContract(contractId!);

      toast.success("Comissão paga!");
      if (onContractUpdated) onContractUpdated();
    } catch (e) {
      // Rollback em caso de erro
      setCommissions(previousCommissions);
      toast.error("Erro ao pagar comissão.");
    }
  };

  const startEditingInstallment = (inst: any) => {
    setEditingInstallmentId(inst.id);
    const dateObj = new Date(inst.due_date.includes("T") ? inst.due_date : inst.due_date + "T12:00:00");
    setEditInstallmentForm({
      value: inst.value,
      due_date: dateObj,
      status: inst.status,
      transaction_fee: inst.transaction_fee || 0,
    });
  };

  const saveInstallment = async (id: string) => {
    // Guarda estado anterior para rollback
    const previousInstallments = [...installments];
    const previousCommissions = [...commissions];
    const previousContract = { ...contract };

    const newVal = Number(editInstallmentForm.value);
    const newFee = Number(editInstallmentForm.transaction_fee);
    const netVal = Math.max(0, newVal - newFee);
    const formattedDate = format(editInstallmentForm.due_date, "yyyy-MM-dd");

    // Detecta diferença de meses na data para propagar às parcelas seguintes
    const editedInst = installments.find((i) => i.id === id);
    const oldDate = editedInst ? new Date(editedInst.due_date.includes("T") ? editedInst.due_date : editedInst.due_date + "T12:00:00") : null;
    const newDate = editInstallmentForm.due_date;
    let monthDiff = 0;
    if (oldDate && newDate) {
      monthDiff = (newDate.getFullYear() - oldDate.getFullYear()) * 12 + (newDate.getMonth() - oldDate.getMonth());
    }

    // Calcula novas datas para parcelas posteriores
    const editedIndex = installments.findIndex((i) => i.id === id);
    const shiftedInstallments = installments.map((inst, idx) => {
      if (inst.id === id) {
        return { ...inst, value: newVal, due_date: formattedDate, status: editInstallmentForm.status, transaction_fee: newFee };
      }
      if (monthDiff !== 0 && idx > editedIndex) {
        const origDate = new Date(inst.due_date.includes("T") ? inst.due_date : inst.due_date + "T12:00:00");
        origDate.setMonth(origDate.getMonth() + monthDiff);
        return { ...inst, due_date: format(origDate, "yyyy-MM-dd") };
      }
      return inst;
    });

    // Optimistic update
    setInstallments(shiftedInstallments);

    // Optimistic update para comissões vinculadas
    setCommissions((prev) =>
      prev.map((comm) => {
        if (comm.installment_id === id) {
          const newCommValue = (netVal * comm.percentage) / 100;
          return { ...comm, value: newCommValue };
        }
        return comm;
      })
    );

    // Calcula novo total otimisticamente
    const newTotal = shiftedInstallments.reduce((acc, curr) => acc + Number(curr.value), 0);
    setContract((prev: any) => ({ ...prev, total_value: newTotal }));
    setEditingInstallmentId(null);

    try {
      // Atualiza a parcela editada
      const { error: instError } = await supabase
        .from("installments")
        .update({
          value: newVal,
          due_date: formattedDate,
          status: editInstallmentForm.status,
          transaction_fee: newFee,
        })
        .eq("id", id);

      if (instError) throw instError;

      // Propaga mudança de data às parcelas posteriores
      if (monthDiff !== 0) {
        for (let idx = editedIndex + 1; idx < installments.length; idx++) {
          const inst = installments[idx];
          const origDate = new Date(inst.due_date.includes("T") ? inst.due_date : inst.due_date + "T12:00:00");
          origDate.setMonth(origDate.getMonth() + monthDiff);
          const newDueDate = format(origDate, "yyyy-MM-dd");
          await supabase.from("installments").update({ due_date: newDueDate }).eq("id", inst.id);
        }
      }

      // Atualiza comissões no servidor
      const { data: linkedCommissions } = await supabase
        .from("commissions")
        .select("id, percentage")
        .eq("installment_id", id);

      if (linkedCommissions) {
        for (const comm of linkedCommissions) {
          const newCommValue = (netVal * comm.percentage) / 100;
          await supabase.from("commissions").update({ value: newCommValue }).eq("id", comm.id);
        }
      }

      // Atualiza total do contrato no servidor
      const { data: all } = await supabase.from("installments").select("value").eq("contract_id", contractId);
      if (all) {
        const serverTotal = all.reduce((acc, curr) => acc + Number(curr.value), 0);
        await supabase.from("contracts").update({ total_value: serverTotal }).eq("id", contractId);
      }

      // Verifica se o contrato foi concluído
      await checkAndCompleteContract(contractId!);

      toast.success(monthDiff !== 0 ? "Parcela e datas seguintes atualizadas!" : "Parcela e comissões atualizadas!");
      if (onContractUpdated) onContractUpdated();
    } catch (error) {
      // Rollback em caso de erro
      setInstallments(previousInstallments);
      setCommissions(previousCommissions);
      setContract(previousContract);
      toast.error("Erro ao salvar parcela.");
    }
  };

  const startEditingCommission = (comm: any) => {
    setEditingCommissionId(comm.id);
    setEditCommissionForm({
      value: comm.value,
      percentage: comm.percentage,
      employee_name: comm.employee_name,
      status: comm.status || "pending",
    });
  };

  const saveCommission = async (id: string) => {
    // Guarda estado anterior para rollback
    const previousCommissions = [...commissions];

    const updatedData = {
      value: Number(editCommissionForm.value),
      percentage: Number(editCommissionForm.percentage),
      employee_name: editCommissionForm.employee_name,
      status: editCommissionForm.status,
    };

    // Optimistic update
    setCommissions((prev) =>
      prev.map((comm) => (comm.id === id ? { ...comm, ...updatedData } : comm))
    );
    setEditingCommissionId(null);

    try {
      const { error } = await supabase.from("commissions").update(updatedData).eq("id", id);
      if (error) throw error;

      // Verifica se o contrato foi concluído
      await checkAndCompleteContract(contractId!);

      toast.success("Comissão atualizada!");
      if (onContractUpdated) onContractUpdated();
    } catch (error) {
      // Rollback em caso de erro
      setCommissions(previousCommissions);
      setEditingCommissionId(id);
      toast.error("Erro ao salvar comissão.");
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const noSpinnerClass =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const addNewInstallment = async () => {
    if (!contractId) return;

    try {
      // Calcula próxima data (+1 mês da última parcela)
      const lastInst = installments[installments.length - 1];
      const lastDate = lastInst
        ? new Date(lastInst.due_date.includes("T") ? lastInst.due_date : lastInst.due_date + "T12:00:00")
        : new Date();
      const nextDate = addMonths(lastDate, 1);
      const dueDateStr = format(nextDate, "yyyy-MM-dd");
      const fee = lastInst ? Number(lastInst.transaction_fee || 0) : 0;

      // 1. Inserir parcela no Supabase
      const { data: newInst, error: instError } = await supabase
        .from("installments")
        .insert({
          contract_id: contractId,
          value: 0,
          due_date: dueDateStr,
          status: "pending" as const,
          transaction_fee: fee,
        })
        .select()
        .single();

      if (instError || !newInst) throw instError || new Error("Erro ao criar parcela");

      // 2. Criar comissões vinculadas (replica beneficiários únicos do contrato)
      const uniqueCommissions = new Map<string, { employee_name: string; percentage: number }>();
      commissions.forEach((c) => {
        if (!uniqueCommissions.has(c.employee_name)) {
          uniqueCommissions.set(c.employee_name, { employee_name: c.employee_name, percentage: c.percentage });
        }
      });

      const newCommissions: any[] = [];
      for (const [, comm] of uniqueCommissions) {
        const netValue = Math.max(0, 0 - fee); // value is 0
        const commValue = (netValue * comm.percentage) / 100;
        const { data: newComm } = await supabase
          .from("commissions")
          .insert({
            contract_id: contractId,
            installment_id: newInst.id,
            employee_name: comm.employee_name,
            percentage: comm.percentage,
            value: commValue,
            status: "pending" as const,
          })
          .select(`*, installments (due_date)`)
          .single();
        if (newComm) newCommissions.push(newComm);
      }

      // 3. Atualizar total do contrato
      const newTotal = installments.reduce((acc, curr) => acc + Number(curr.value), 0) + 0;
      await supabase.from("contracts").update({ total_value: newTotal }).eq("id", contractId);

      // 4. Atualizar estado local
      setInstallments((prev) => [...prev, newInst]);
      setCommissions((prev) => [...prev, ...newCommissions]);
      setContract((prev: any) => ({ ...prev, total_value: newTotal }));

      // 5. Entrar em modo edição da nova parcela
      startEditingInstallment(newInst);

      toast.success("Parcela adicionada! Ajuste o valor.");
      if (onContractUpdated) onContractUpdated();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar parcela.");
    }
  };

  if (!contract) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#E8BD27]" />
              Detalhes do Contrato
            </DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                Editar Contrato
              </Button>
              <Badge variant="outline" className="border-[#E8BD27] text-[#E8BD27]">
                {contract.status === "active" ? "Ativo" : "Concluído"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="installments" className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="installments">Parcelas & Pagamentos</TabsTrigger>
            <TabsTrigger value="commissions">Comissões & Repasses</TabsTrigger>
          </TabsList>

          <TabsContent value="installments" className="flex-1 flex flex-col mt-4 gap-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/50 shrink-0">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Valor Total do Contrato</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(contract.total_value)}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium flex items-center justify-end gap-2">
                  <User className="h-4 w-4" />
                  {contract.clients?.name}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-border/50 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Vencimento</TableHead>
                    <TableHead className="w-[120px]">Valor</TableHead>
                    <TableHead className="w-[100px]">Taxa</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => {
                    const isEditing = editingInstallmentId === inst.id;
                    return (
                      <TableRow key={inst.id}>
                        <TableCell>
                          {isEditing ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-8",
                                    !editInstallmentForm.due_date && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {editInstallmentForm.due_date ? (
                                    format(editInstallmentForm.due_date, "dd/MM/yyyy")
                                  ) : (
                                    <span>Data</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={editInstallmentForm.due_date}
                                  onSelect={(date) =>
                                    setEditInstallmentForm({ ...editInstallmentForm, due_date: date })
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="font-medium">{formatDate(inst.due_date)}</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editInstallmentForm.value}
                              onChange={(e) =>
                                setEditInstallmentForm({ ...editInstallmentForm, value: e.target.value })
                              }
                              className={`h-8 ${noSpinnerClass}`}
                            />
                          ) : (
                            formatCurrency(inst.value)
                          )}
                        </TableCell>

                        <TableCell>
                          {isEditing ? (
                            <div className="relative">
                              <Input
                                type="number"
                                value={editInstallmentForm.transaction_fee}
                                onChange={(e) =>
                                  setEditInstallmentForm({ ...editInstallmentForm, transaction_fee: e.target.value })
                                }
                                className={`h-8 pr-2 text-red-400 ${noSpinnerClass}`}
                              />
                            </div>
                          ) : (
                            <span className="text-red-400 text-sm">{formatCurrency(inst.transaction_fee || 0)}</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editInstallmentForm.status}
                              onValueChange={(val) => setEditInstallmentForm({ ...editInstallmentForm, status: val })}
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="paid">Pago</SelectItem>
                                <SelectItem value="overdue">Atrasado</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant={inst.status === "paid" ? "default" : "secondary"}
                              className={
                                inst.status === "paid"
                                  ? "bg-emerald-500 hover:bg-emerald-600"
                                  : "bg-yellow-500/10 text-yellow-600"
                              }
                            >
                              {inst.status === "paid" ? "Pago" : "Pendente"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-500"
                                onClick={() => saveInstallment(inst.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500"
                                onClick={() => setEditingInstallmentId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              {inst.status !== "paid" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                        onClick={() => quickPayInstallment(inst.id)}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Marcar como Pago</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => startEditingInstallment(inst)}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed gap-2 text-muted-foreground shrink-0"
              onClick={addNewInstallment}
            >
              <Plus className="h-4 w-4" />
              Adicionar Parcela
            </Button>
          </TabsContent>

          <TabsContent value="commissions" className="flex-1 flex flex-col mt-4 gap-4 overflow-hidden">
            <div className="p-4 bg-muted/20 rounded-lg border border-border/50 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#E8BD27]/10 rounded-full text-[#E8BD27]">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Resumo de Comissões</h4>
                  <p className="text-sm text-muted-foreground">Repasses aos parceiros organizados por competência.</p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border/50 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Beneficiário</TableHead>
                    <TableHead className="w-[100px]">%</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                {commissionsGroups.length === 0 ? (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        Nenhuma comissão cadastrada.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ) : (
                  <TableBody>
                    {commissionsGroups.map((group) => (
                      <>
                        <TableRow key={group.label} className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={5} className="py-2 font-semibold text-primary flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {group.label}
                          </TableCell>
                        </TableRow>

                        {group.items.map((comm) => {
                          const isEditing = editingCommissionId === comm.id;
                          return (
                            <TableRow key={comm.id} className="hover:bg-muted/5">
                              <TableCell>
                                {isEditing ? (
                                  <Select
                                    value={editCommissionForm.employee_name}
                                    onValueChange={(val) =>
                                      setEditCommissionForm({ ...editCommissionForm, employee_name: val })
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-full">
                                      <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.name}>
                                          {emp.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="font-medium ml-4">{comm.employee_name}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={editCommissionForm.percentage}
                                    onChange={(e) =>
                                      setEditCommissionForm({ ...editCommissionForm, percentage: e.target.value })
                                    }
                                    className={`h-8 ${noSpinnerClass}`}
                                  />
                                ) : (
                                  <span className="text-muted-foreground">{comm.percentage}%</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={editCommissionForm.value}
                                    onChange={(e) =>
                                      setEditCommissionForm({ ...editCommissionForm, value: e.target.value })
                                    }
                                    className={`h-8 ${noSpinnerClass}`}
                                  />
                                ) : (
                                  <span className="text-red-400 font-medium">{formatCurrency(comm.value)}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Select
                                    value={editCommissionForm.status}
                                    onValueChange={(val) =>
                                      setEditCommissionForm({ ...editCommissionForm, status: val })
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pendente</SelectItem>
                                      <SelectItem value="paid">Pago</SelectItem>
                                      <SelectItem value="cancelled">Cancelado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className={
                                      comm.status === "paid"
                                        ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                                        : "border-yellow-500 text-yellow-600 bg-yellow-500/10"
                                    }
                                  >
                                    {comm.status === "paid" ? "Pago" : "Pendente"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-green-500"
                                      onClick={() => saveCommission(comm.id)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-red-500"
                                      onClick={() => setEditingCommissionId(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-1">
                                    {comm.status !== "paid" && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                              onClick={() => quickPayCommission(comm.id)}
                                            >
                                              <CheckCircle2 className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Marcar como Pago</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => startEditingCommission(comm)}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </>
                    ))}
                  </TableBody>
                )}
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    <EditContractDialog
      contractId={contractId}
      open={isEditDialogOpen}
      onOpenChange={setIsEditDialogOpen}
      onContractUpdated={() => {
        fetchContractDetails();
        if (onContractUpdated) onContractUpdated();
      }}
    />
    </>
  );
}
