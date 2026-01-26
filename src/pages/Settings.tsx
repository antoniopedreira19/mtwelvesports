import { User, Bell, Shield, Database, HelpCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
// Importa o novo componente que criamos (Certifique-se que ele existe em src/components/modules/settings/)
import { EmployeesManager } from "@/components/modules/settings/EmployeesManager";

export default function Settings() {
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas preferências, equipe e configurações do sistema.</p>
      </div>

      {/* 1. Profile Section (Mantido) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold">Perfil</h2>
            <p className="text-sm text-muted-foreground">Suas informações pessoais</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-card border border-border/50">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" defaultValue="João Martins" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="joao@mtwelve.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Input id="role" defaultValue="Agente Senior" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" defaultValue="(11) 99999-9999" />
          </div>
        </div>
      </div>

      <Separator />

      {/* 2. NOVA SEÇÃO: Equipe & Comissionados (Adicionado Aqui) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold">Equipe & Comissionados</h2>
            <p className="text-sm text-muted-foreground">Gerencie agentes e parceiros para comissões</p>
          </div>
        </div>

        {/* Aqui renderizamos o componente de gestão que criamos */}
        <EmployeesManager />
      </div>

      <Separator />

      {/* 3. Notifications (Mantido) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold">Notificações</h2>
            <p className="text-sm text-muted-foreground">Configure suas preferências de alertas</p>
          </div>
        </div>

        <div className="space-y-4 p-4 rounded-xl bg-card border border-border/50">
          {[
            { label: "Novos clientes no pipeline", description: "Receba alertas quando novos atletas entrarem" },
            { label: "Pagamentos pendentes", description: "Lembretes de parcelas a vencer" },
            { label: "Atualizações de contratos", description: "Notificações sobre alterações em contratos" },
            { label: "Relatórios semanais", description: "Resumo semanal por email" },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch defaultChecked={index < 3} />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* 4. Security (Mantido) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold">Segurança</h2>
            <p className="text-sm text-muted-foreground">Proteja sua conta</p>
          </div>
        </div>

        <div className="space-y-4 p-4 rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Autenticação de dois fatores</p>
              <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança</p>
            </div>
            <Button variant="outline" size="sm">
              Configurar
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Alterar senha</p>
              <p className="text-xs text-muted-foreground">Última alteração há 30 dias</p>
            </div>
            <Button variant="outline" size="sm">
              Alterar
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* 5. Integration Placeholder (Mantido) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold">Integrações</h2>
            <p className="text-sm text-muted-foreground">Conecte com outros serviços</p>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Em Breve</h3>
          <p className="text-sm text-muted-foreground mb-4">Integrações com WhatsApp, Google Calendar e mais</p>
          <Button variant="outline" disabled>
            Ver Integrações
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 pb-8">
        <Button className="gold-gradient text-primary-foreground">Salvar Alterações</Button>
      </div>
    </div>
  );
}
