import { useState } from "react";
import { Outlet } from "react-router-dom";
import { LogOut, Home, LayoutGrid, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "home", label: "Início", icon: Home },
  { value: "placement", label: "Placement Board", icon: LayoutGrid },
  { value: "payments", label: "Pagamentos", icon: CreditCard },
];

export function AthleteLayout() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#09090b]">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b border-white/5 bg-black/80 backdrop-blur-md sticky top-0 z-20">
        <span className="font-bold text-lg tracking-tight text-[#E8BD27] shrink-0">MTwelve</span>

        {/* Navigation tabs in header */}
        <nav className="flex items-center gap-1 mx-4">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === tab.value
                  ? "bg-[#E8BD27]/15 text-[#E8BD27]"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors rounded-lg px-3 py-2 hover:bg-white/5 shrink-0"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <Outlet context={{ activeTab, setActiveTab }} />
      </main>

      <Toaster />
    </div>
  );
}
