import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[#09090b]">
        {" "}
        {/* Fundo escuro global */}
        <AppSidebar />
        {/* Conteúdo Principal */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background transition-all duration-300 ease-in-out">
          {/* Header do Layout com o Botão de Controle */}
          <header className="flex items-center h-16 px-6 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" />
            <div className="ml-4 h-4 w-[1px] bg-border/50" /> {/* Separador sutil */}
            <span className="ml-4 text-sm text-muted-foreground">Gestão Esportiva</span>
          </header>

          {/* Area de Scroll das Páginas */}
          <div className="flex-1 overflow-auto p-4 md:p-8">
            <Outlet />
          </div>
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
