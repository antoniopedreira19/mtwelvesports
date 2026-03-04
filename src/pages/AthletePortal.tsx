import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  LayoutGrid,
  CreditCard,
  BookOpen,
  Globe,
  FileText,
  Shield,
  Trophy,
  Construction,
  Sparkles,
} from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email?.charAt(0).toUpperCase() || "A";
}

const resources = [
  {
    title: "Processo de Transferência",
    description: "Entenda como funciona o processo de transferência para universidades americanas.",
    icon: Globe,
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
  },
  {
    title: "Elegibilidade NCAA / NAIA",
    description: "Requisitos acadêmicos e esportivos para competir nos EUA.",
    icon: Shield,
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
  },
  {
    title: "Documentação Necessária",
    description: "Lista completa de documentos para o processo de intercâmbio.",
    icon: FileText,
    color: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-400",
  },
  {
    title: "Guia de Ligas & Divisões",
    description: "Conheça as diferenças entre NCAA D1, D2, D3, NAIA e NJCAA.",
    icon: Trophy,
    color: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-400",
  },
];

function ComingSoonPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#E8BD27]/10 flex items-center justify-center">
        <Construction className="w-8 h-8 text-[#E8BD27]" />
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-white/50 max-w-md">{description}</p>
    </div>
  );
}

export default function AthletePortal() {
  const { profile, isLoading } = useProfile();
  const [activeTab, setActiveTab] = useState("home");

  const greeting = getGreeting();
  const displayName = profile?.name || profile?.email?.split("@")[0] || "Atleta";
  const initials = getInitials(profile?.name, profile?.email);

  return (
    <div className="min-h-[80vh] space-y-6 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a0a] border border-white/5 p-6 md:p-8">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#E8BD27]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#E8BD27]/3 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative flex items-center gap-5">
          {isLoading ? (
            <Skeleton className="h-16 w-16 rounded-2xl" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#E8BD27] to-[#c9a020] flex items-center justify-center shadow-lg shadow-[#E8BD27]/20 shrink-0">
              <span className="text-xl font-bold text-black">{initials}</span>
            </div>
          )}

          <div className="flex flex-col gap-1 min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
              </>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {greeting},{" "}
                  <span className="text-[#E8BD27]">{displayName}</span>
                  <Sparkles className="inline-block w-5 h-5 ml-2 text-[#E8BD27]/60 -translate-y-1" />
                </h1>
                <p className="text-white/40 text-sm md:text-base">
                  Seu caminho para o esporte universitário americano começa aqui.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#141414] border border-white/5 p-1 rounded-xl w-full md:w-auto">
          <TabsTrigger
            value="home"
            className="data-[state=active]:bg-[#E8BD27]/15 data-[state=active]:text-[#E8BD27] text-white/50 rounded-lg gap-2 px-4"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Início</span>
          </TabsTrigger>
          <TabsTrigger
            value="placement"
            className="data-[state=active]:bg-[#E8BD27]/15 data-[state=active]:text-[#E8BD27] text-white/50 rounded-lg gap-2 px-4"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Placement Board</span>
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="data-[state=active]:bg-[#E8BD27]/15 data-[state=active]:text-[#E8BD27] text-white/50 rounded-lg gap-2 px-4"
          >
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Pagamentos</span>
          </TabsTrigger>
        </TabsList>

        {/* HOME TAB */}
        <TabsContent value="home" className="mt-6 space-y-6 animate-in fade-in duration-300">
          {/* Resources */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-[#E8BD27]" />
              <h2 className="text-lg font-semibold text-white">Recursos Educativos</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resources.map((resource) => (
                <Card
                  key={resource.title}
                  className="bg-[#141414] border-white/5 hover:border-[#E8BD27]/20 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-[#E8BD27]/5"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${resource.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <resource.icon className={`w-5 h-5 ${resource.iconColor}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base text-white group-hover:text-[#E8BD27] transition-colors">
                          {resource.title}
                        </CardTitle>
                        <CardDescription className="text-white/40 text-sm mt-1">
                          {resource.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Badge variant="outline" className="text-white/30 border-white/10 text-xs">
                      Em breve
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* PLACEMENT TAB */}
        <TabsContent value="placement" className="mt-6 animate-in fade-in duration-300">
          <ComingSoonPlaceholder
            title="Placement Board"
            description="Em breve você poderá acompanhar as universidades interessadas no seu perfil e o status de cada oportunidade."
          />
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="mt-6 animate-in fade-in duration-300">
          <ComingSoonPlaceholder
            title="Pagamentos"
            description="Em breve você poderá visualizar suas parcelas, status de pagamento e histórico financeiro."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
