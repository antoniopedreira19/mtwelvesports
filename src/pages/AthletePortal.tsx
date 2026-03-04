import { useOutletContext } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Globe,
  FileText,
  Shield,
  Trophy,
  Construction,
  Sparkles,
  Upload,
  FileCheck,
  FilePlus2,
  GraduationCap,
  Stethoscope,
  Camera,
} from "lucide-react";
import { AthletePaymentsTab } from "@/components/modules/athlete/AthletePaymentsTab";

type AthleteContext = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name) return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return email?.charAt(0).toUpperCase() || "A";
}

const educationalResources = [
  { title: "Processo de Transferência", description: "Entenda como funciona o processo de transferência para universidades americanas.", icon: Globe, color: "from-blue-500/20 to-blue-600/10", iconColor: "text-blue-400" },
  { title: "Elegibilidade NCAA / NAIA", description: "Requisitos acadêmicos e esportivos para competir nos EUA.", icon: Shield, color: "from-emerald-500/20 to-emerald-600/10", iconColor: "text-emerald-400" },
  { title: "Guia de Ligas & Divisões", description: "Conheça as diferenças entre NCAA D1, D2, D3, NAIA e NJCAA.", icon: Trophy, color: "from-purple-500/20 to-purple-600/10", iconColor: "text-purple-400" },
];

const requiredDocuments = [
  { title: "Histórico Escolar", description: "Histórico escolar traduzido e apostilado.", icon: GraduationCap, color: "from-amber-500/20 to-amber-600/10", iconColor: "text-amber-400" },
  { title: "Passaporte", description: "Cópia digitalizada do passaporte válido.", icon: FileText, color: "from-sky-500/20 to-sky-600/10", iconColor: "text-sky-400" },
  { title: "Atestado Médico", description: "Atestado médico para prática esportiva.", icon: Stethoscope, color: "from-rose-500/20 to-rose-600/10", iconColor: "text-rose-400" },
  { title: "Vídeo de Highlight", description: "Vídeo com os melhores momentos esportivos.", icon: Camera, color: "from-violet-500/20 to-violet-600/10", iconColor: "text-violet-400" },
  { title: "Certificado de Proficiência", description: "TOEFL, IELTS, Duolingo ou equivalente.", icon: FileCheck, color: "from-teal-500/20 to-teal-600/10", iconColor: "text-teal-400" },
  { title: "Outros Documentos", description: "Documentos adicionais solicitados pela assessoria.", icon: FilePlus2, color: "from-orange-500/20 to-orange-600/10", iconColor: "text-orange-400" },
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

function DocumentCard({ doc }: { doc: typeof requiredDocuments[number] }) {
  return (
    <Card className="bg-[#141414] border-white/5 hover:border-[#E8BD27]/20 transition-all duration-300 group hover:shadow-lg hover:shadow-[#E8BD27]/5">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${doc.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
            <doc.icon className={`w-5 h-5 ${doc.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base text-white group-hover:text-[#E8BD27] transition-colors">{doc.title}</CardTitle>
            <CardDescription className="text-white/40 text-sm mt-1">{doc.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] hover:border-[#E8BD27]/30 hover:bg-[#E8BD27]/5 text-white/40 hover:text-[#E8BD27] transition-all duration-300 py-3 text-sm cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>Enviar arquivo</span>
        </button>
      </CardContent>
    </Card>
  );
}

export default function AthletePortal() {
  const { profile, isLoading } = useProfile();
  const { activeTab } = useOutletContext<AthleteContext>();

  const displayName = profile?.name || profile?.email?.split("@")[0] || "Atleta";
  const initials = getInitials(profile?.name, profile?.email);

  return (
    <div className="min-h-[80vh] space-y-6 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a0a] border border-white/5 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#E8BD27]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
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
                  Bem-vindo, <span className="text-[#E8BD27]">{displayName}</span>
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

      {/* Tab Content */}
      {activeTab === "home" && (
        <div className="space-y-10 animate-in fade-in duration-300">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-[#E8BD27]" />
              <h2 className="text-lg font-semibold text-white">Recursos Educativos</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {educationalResources.map((resource) => (
                <Card key={resource.title} className="bg-[#141414] border-white/5 hover:border-[#E8BD27]/20 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-[#E8BD27]/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${resource.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        <resource.icon className={`w-5 h-5 ${resource.iconColor}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base text-white group-hover:text-[#E8BD27] transition-colors">{resource.title}</CardTitle>
                        <CardDescription className="text-white/40 text-sm mt-1">{resource.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Badge variant="outline" className="text-white/30 border-white/10 text-xs">Em breve</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-1">
              <Upload className="w-5 h-5 text-[#E8BD27]" />
              <h2 className="text-lg font-semibold text-white">Documentos Necessários</h2>
            </div>
            <p className="text-white/40 text-sm mb-4">Envie os documentos abaixo para dar continuidade ao seu processo de intercâmbio esportivo.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {requiredDocuments.map((doc) => (
                <DocumentCard key={doc.title} doc={doc} />
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "placement" && (
        <div className="animate-in fade-in duration-300">
          <ComingSoonPlaceholder title="Placement Board" description="Em breve você poderá acompanhar as universidades interessadas no seu perfil e o status de cada oportunidade." />
        </div>
      )}

      {activeTab === "payments" && (
        <div className="animate-in fade-in duration-300">
          <AthletePaymentsTab />
        </div>
      )}
    </div>
  );
}
