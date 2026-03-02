import { useEffect, useState } from "react";
import { Plus, Trash2, Mail, Briefcase, Loader2, Pencil, Percent } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Employee {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  perc_participacao: number | null;
}

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  role: z.string().min(2, "Cargo/Função é obrigatória"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  perc_participacao: z.coerce.number().min(0).max(100).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EmployeesManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", role: "", email: "", perc_participacao: undefined },
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Erro ao buscar equipe:", error);
      toast.error("Erro ao carregar a equipe.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingEmployee(null);
    form.reset({ name: "", role: "", email: "", perc_participacao: undefined });
    setIsDialogOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    form.reset({
      name: emp.name,
      role: emp.role || "",
      email: emp.email || "",
      perc_participacao: emp.perc_participacao ?? undefined,
    });
    setIsDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setIsSaving(true);
    try {
      const payload = {
        name: values.name,
        role: values.role,
        email: values.email || null,
        perc_participacao: values.perc_participacao ?? null,
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", editingEmployee.id);
        if (error) throw error;
        toast.success("Membro atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
        toast.success("Membro adicionado com sucesso!");
      }

      setIsDialogOpen(false);
      form.reset();
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar membro.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
      toast.success("Membro removido.");
      fetchEmployees();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover membro.");
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Equipe & Comissionados</CardTitle>
          <CardDescription>
            Gerencie as pessoas elegíveis para receber comissões.
          </CardDescription>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingEmployee(null);
        }}>
          <DialogTrigger asChild>
            <Button className="gold-gradient text-primary-foreground font-semibold" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? "Atualize os dados do membro da equipe."
                  : "Cadastre um agente ou parceiro para vincular a contratos."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Função / Cargo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Agente, Scout, Advogado..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="joao@mtwelve.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="perc_participacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% de Participação / Dividendos</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            placeholder="Ex: 10"
                            {...field}
                            value={field.value ?? ""}
                          />
                          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSaving} className="w-full gold-gradient">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingEmployee ? "Salvar Alterações" : "Salvar Cadastro"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            Nenhum membro cadastrado. Adicione o primeiro acima.
          </div>
        ) : (
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>% Participação</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-muted/5">
                    <TableCell className="flex items-center gap-3 font-medium">
                      <Avatar className="h-8 w-8 bg-muted border border-border">
                        <AvatarFallback>{employee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {employee.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        {employee.role}
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.perc_participacao != null ? (
                        <span className="text-muted-foreground">{employee.perc_participacao}%</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.email && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(employee)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() => handleDelete(employee.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
