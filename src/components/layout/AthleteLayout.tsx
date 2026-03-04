import { Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

const LOGO_URL =
  "https://ychhgfsavlnoyjvfpdxa.supabase.co/storage/v1/object/public/logos&templates/image-removebg-preview%20(2).png";

export function AthleteLayout() {
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#09090b]">
      {/* Header */}
      <header className="flex items-center justify-between h-16 px-6 border-b border-white/5 bg-black/80 backdrop-blur-md sticky top-0 z-20">
        <span className="font-bold text-lg tracking-tight text-[#E8BD27]">MTwelve</span>

        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors rounded-lg px-3 py-2 hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
