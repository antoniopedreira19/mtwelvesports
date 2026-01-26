import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, User, Mail, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Client } from "@/types";

// Schema de Validação
const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  stage: z.enum(["radar", "contato", "negociacao", "fechado", "perdido"]),
});

interface NewClientDialogProps {
  onSuccess?: (client?: Client) => void;
}

// Componente do Formulário (reutilizável)
export function NewClientForm({ onSuccess }: NewClientDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      nationality: "",
      stage: "radar",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const clientData: TablesInsert<"clients"> = {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        nationality: values.nationality || null,
        stage: values.stage,
      };

      const { data, error } = await supabase
        .from("clients")
        .insert(clientData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Atleta cadastrado com sucesso!");
      form.reset();
      if (onSuccess) onSuccess(data as Client);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar atleta.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Ex: Gabriel Jesus" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nacionalidade */}
        <FormField
          control={form.control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nacionalidade</FormLabel>
              <FormControl>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Ex: Brasil" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Opcional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="email@exemplo.com" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Telefone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone (Opcional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="(11) 99999-9999" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Estágio Inicial */}
        <FormField
          control={form.control}
          name="stage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fase do Pipeline</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fase inicial" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="radar">Radar (Prospecção)</SelectItem>
                  <SelectItem value="contato">Em Contato</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="fechado">Fechado (Já é nosso atleta)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className="pt-4">
          <Button type="submit" disabled={isLoading} className="w-full gold-gradient text-black font-bold">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Atleta
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// Componente Dialog Completo (com trigger)
export function NewClientDialog({ onSuccess }: NewClientDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = (client?: Client) => {
    setOpen(false);
    if (onSuccess) onSuccess(client);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gold-gradient text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Novo Atleta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Novo Atleta</DialogTitle>
          <DialogDescription>
            Cadastre os dados do atleta para iniciar o acompanhamento no CRM.
          </DialogDescription>
        </DialogHeader>
        <NewClientForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
