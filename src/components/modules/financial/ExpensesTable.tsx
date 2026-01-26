import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Pencil, Search, Loader2, CalendarRange } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NewExpenseDialog } from "./NewExpenseDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function ExpensesTable() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    setIsLoading(true);
    try {
      // Buscamos do banco ordenado por data apenas como base
      const { data, error } = await supabase.from("expenses").select("*").order("due_date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar despesas.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;

    // Guarda estado anterior para rollback
    const previousExpenses = [...expenses];
    const expenseToDelete = expenses.find((e) => e.id === deletingId);

    // Optimistic update - remove imediatamente
    setExpenses((prev) => prev.filter((e) => e.id !== deletingId));
    setDeletingId(null);

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseToDelete?.id);
      if (error) throw error;

      toast.success("Despesa removida.");
    } catch (error) {
      // Rollback em caso de erro
      setExpenses(previousExpenses);
      toast.error("Erro ao remover despesa.");
    }
  }

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  // --- LÓGICA DE AGRUPAMENTO E ORDENAÇÃO ROBUSTA ---
  const groupedExpenses = useMemo(() => {
    const filtered = expenses.filter((exp) => exp.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const groups: Record<string, { label: string; items: any[]; total: number }> = {};

    // 1. Agrupamento
    filtered.forEach((expense) => {
      const dateObj = new Date(expense.due_date + "T12:00:00");
      const key = format(dateObj, "yyyy-MM");
      const label = format(dateObj, "MMMM yyyy", { locale: ptBR });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

      if (!groups[key]) {
        groups[key] = { label: capitalizedLabel, items: [], total: 0 };
      }

      groups[key].items.push(expense);
      groups[key].total += Number(expense.amount);
    });

    // 2. Ordenação Forçada em cada grupo
    Object.keys(groups).forEach((key) => {
      groups[key].items.sort((a, b) => {
        // --- Critério 1: STATUS ---
        // Definimos pesos: Pago = 1, Pendente (ou qualquer outro) = 0
        // Queremos menor peso primeiro (Pendente antes de Pago)
        const weightA = a.status === "paid" ? 1 : 0;
        const weightB = b.status === "paid" ? 1 : 0;

        if (weightA !== weightB) {
          return weightA - weightB; // Se A=0 (Pendente) e B=1 (Pago), retorna -1 (A sobe)
        }

        // --- Critério 2: DATA (Desempate) ---
        // Se o status for igual, ordena por data (mais recente primeiro)
        if (a.due_date < b.due_date) return 1;
        if (a.due_date > b.due_date) return -1;

        return 0;
      });
    });

    return groups;
  }, [expenses, searchTerm]);

  const sortedMonthKeys = Object.keys(groupedExpenses).sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar despesa..."
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedMonthKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-xl">
          <CalendarRange className="h-10 w-10 mb-2 opacity-20" />
          <p>Nenhuma despesa encontrada.</p>
        </div>
      ) : (
        sortedMonthKeys.map((monthKey) => {
          const group = groupedExpenses[monthKey];

          return (
            <div key={monthKey} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-[#E8BD27]">
                  <span className="w-2 h-2 rounded-full bg-[#E8BD27]" />
                  {group.label}
                </h3>
                <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  Total: {formatCurrency(group.total)}
                </span>
              </div>

              <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Dia</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-muted/5">
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{expense.category}</TableCell>
                        <TableCell>
                          {format(new Date(expense.due_date + "T12:00:00"), "dd", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium text-red-500">- {formatCurrency(expense.amount)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={expense.status === "paid" ? "default" : "secondary"}
                            className={
                              expense.status === "paid"
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"
                            }
                          >
                            {expense.status === "paid" ? "Pago" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingId(expense.id)}>
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A despesa será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewExpenseDialog
        openProp={isEditModalOpen}
        onOpenChangeProp={setIsEditModalOpen}
        expenseToEdit={editingExpense}
        onSuccess={(updatedExpense?: any) => {
          if (updatedExpense && editingExpense) {
            // Optimistic update para edição
            setExpenses((prev) =>
              prev.map((e) => (e.id === editingExpense.id ? { ...e, ...updatedExpense } : e))
            );
          } else {
            // Refetch para novas despesas
            fetchExpenses();
          }
          setEditingExpense(null);
        }}
      />
    </div>
  );
}
