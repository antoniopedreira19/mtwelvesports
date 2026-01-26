import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { TablesInsert } from "@/integrations/supabase/types";
import { CalendarIcon, Loader2, Plus, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  description: z.string().min(2, "Descrição obrigatória"),
  amount: z.string().min(1, "Valor obrigatório"),
  category: z.enum(["fixo", "variavel", "extra", "imposto", "comissao"]),
  dueDate: z.date({ required_error: "Data de vencimento obrigatória" }),
  isPaid: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
});

interface NewExpenseDialogProps {
  onSuccess?: (updatedExpense?: any) => void;
  expenseToEdit?: any; // Se passar isso, vira modo de edição
  openProp?: boolean; // Controle externo de abertura
  onOpenChangeProp?: (open: boolean) => void;
}

export function NewExpenseDialog({ onSuccess, expenseToEdit, openProp, onOpenChangeProp }: NewExpenseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Controle se usa estado interno ou props externas
  const isOpen = openProp !== undefined ? openProp : internalOpen;
  const setOpen = onOpenChangeProp || setInternalOpen;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "variavel",
      isPaid: false,
      isRecurring: false,
    },
  });

  // Preenche o formulário se for edição
  useEffect(() => {
    if (expenseToEdit) {
      // Ajuste para lidar com a data vinda do banco (YYYY-MM-DD)
      const dateParts = expenseToEdit.due_date.split("-"); // [2025, 12, 01]
      // Cria a data localmente sem conversão de fuso (ano, mês-1, dia)
      const localDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));

      form.reset({
        description: expenseToEdit.description,
        amount: String(expenseToEdit.amount),
        category: expenseToEdit.category,
        dueDate: localDate,
        isPaid: expenseToEdit.status === "paid",
        isRecurring: expenseToEdit.is_recurring || false,
      });
    }
  }, [expenseToEdit, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const expenseData: TablesInsert<"expenses"> = {
      description: values.description,
      amount: Number(values.amount),
      category: values.category,
      due_date: format(values.dueDate, "yyyy-MM-dd"),
      status: values.isPaid ? "paid" : "pending",
      paid_at: values.isPaid ? new Date().toISOString() : null,
      is_recurring: values.isRecurring,
    };

    // Fecha o modal e reseta imediatamente (optimistic)
    setOpen(false);
    form.reset();

    try {
      let error;

      if (expenseToEdit) {
        // UPDATE
        const { error: updateError } = await supabase.from("expenses").update(expenseData).eq("id", expenseToEdit.id);
        error = updateError;
        
        if (!error && onSuccess) {
          // Passa dados atualizados para optimistic update
          onSuccess({ ...expenseToEdit, ...expenseData });
        }
      } else {
        // INSERT
        const { error: insertError } = await supabase.from("expenses").insert(expenseData);
        error = insertError;
        
        if (!error && onSuccess) {
          onSuccess(); // Refetch para novos itens
        }
      }

      if (error) throw error;

      toast.success(expenseToEdit ? "Despesa atualizada!" : "Despesa cadastrada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar despesa. Recarregue a página.");
      // Em caso de erro, chama onSuccess sem dados para forçar refetch
      if (onSuccess) onSuccess();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {/* Só mostra o Trigger se não estiver sendo controlado externamente para edição */}
      {!expenseToEdit && openProp === undefined && (
        <DialogTrigger asChild>
          <Button className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Nova Despesa
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{expenseToEdit ? "Editar Despesa" : "Cadastrar Despesa"}</DialogTitle>
          <DialogDescription>
            {expenseToEdit ? "Altere os dados abaixo." : "Lance seus custos fixos, variáveis ou extras."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Aluguel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixo">Custo Fixo</SelectItem>
                        <SelectItem value="variavel">Custo Variável</SelectItem>
                        <SelectItem value="extra">Extra / Eventual</SelectItem>
                        <SelectItem value="imposto">Impostos</SelectItem>
                        <SelectItem value="comissao">Comissão</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Vencimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3 pt-2">
              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Já está pago?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full gold-gradient text-black font-bold">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {expenseToEdit ? "Salvar Alterações" : "Salvar Despesa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
