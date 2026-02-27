import { LayoutDashboard, Users, UserCheck, Wallet, Settings, LogOut, UserCircle } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const isCollapsed = state === "collapsed";

  // URL da Logo Atualizada (Versão 2)
  const LOGO_URL =
    "https://ychhgfsavlnoyjvfpdxa.supabase.co/storage/v1/object/public/logos&templates/image-removebg-preview%20(2).png";

  // Menu items based on role
  const mainMenuItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, adminOnly: true },
    { title: "DRE", url: "/dre", icon: Wallet, adminOnly: true },
    { title: "Gestão de Contratos", url: "/gestao-contratos", icon: UserCheck, adminOnly: true },
    { title: "CRM", url: "/crm", icon: Users, adminOnly: false },
    { title: "Clientes Ativos", url: "/clientes-ativos", icon: UserCircle, adminOnly: true },
  ];

  const menuItems = mainMenuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-black text-white">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-border/10">
        <div
          className={cn(
            "flex items-center gap-3 transition-all duration-300",
            isCollapsed ? "justify-center" : "w-full px-2",
          )}
        >
          {/* LOGO: Sempre visível, ajusta o tamanho suavemente */}
          <img
            src={LOGO_URL}
            alt="MTwelve"
            className={cn("object-contain transition-all duration-300", isCollapsed ? "h-8 w-8" : "h-10 w-10")}
          />

          {/* TEXTO: Desaparece suavemente ao minimizar */}
          {!isCollapsed && (
            <span className="font-bold text-xl tracking-tight text-[#E8BD27] animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap">
              MTwelve
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title} // Tooltip nativo aparece quando minimizado
                isActive={location.pathname === item.url}
                className="hover:bg-white/10 active:bg-white/10 data-[active=true]:bg-[#E8BD27]/20 data-[active=true]:text-[#E8BD27] transition-all duration-200"
              >
                <NavLink to={item.url} className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      location.pathname === item.url ? "text-[#E8BD27]" : "text-muted-foreground",
                    )}
                  />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/10">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 transition-all",
            isCollapsed && "justify-center px-0",
          )}
        >
          <Avatar className="h-9 w-9 border-2 border-[#E8BD27]/20 shrink-0">
            <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <>
              <div className="flex flex-col overflow-hidden animate-in fade-in duration-300 flex-1 min-w-0">
                <span className="text-sm font-medium text-white truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isAdmin && (
                  <NavLink
                    to="/settings"
                    className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center transition-all hover:bg-white/10",
                      location.pathname === "/settings" && "bg-[#E8BD27]/20"
                    )}
                    title="Settings"
                  >
                    <Settings className={cn("h-4 w-4", location.pathname === "/settings" ? "text-[#E8BD27]" : "text-muted-foreground")} />
                  </NavLink>
                )}
                <button
                  onClick={signOut}
                  className="h-8 w-8 rounded-md flex items-center justify-center transition-all text-muted-foreground hover:text-white hover:bg-white/10"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {isCollapsed && (
          <div className="flex flex-col items-center gap-1 mt-1">
            {isAdmin && (
              <NavLink
                to="/settings"
                className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center transition-all hover:bg-white/10",
                  location.pathname === "/settings" && "bg-[#E8BD27]/20"
                )}
                title="Settings"
              >
                <Settings className={cn("h-4 w-4", location.pathname === "/settings" ? "text-[#E8BD27]" : "text-muted-foreground")} />
              </NavLink>
            )}
            <button
              onClick={signOut}
              className="h-8 w-8 rounded-md flex items-center justify-center transition-all text-muted-foreground hover:text-white hover:bg-white/10"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
