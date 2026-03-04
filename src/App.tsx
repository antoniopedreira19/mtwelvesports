import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AthleteLayout } from "@/components/layout/AthleteLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import GestaoContratos from "./pages/ClientesAtivos";
import Financeiro from "./pages/Financeiro";
import ClientesAtivosFinanceiro from "./pages/ClientesAtivosFinanceiro";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import AthletePortal from "./pages/AthletePortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />

            {/* Athlete portal - own layout without sidebar */}
            <Route element={<ProtectedRoute><AthleteLayout /></ProtectedRoute>}>
              <Route
                path="/athlete-portal"
                element={
                  <RoleProtectedRoute allowedRoles={["client"]} fallbackPath="/">
                    <AthletePortal />
                  </RoleProtectedRoute>
                }
              />
            </Route>

            {/* Admin/member layout with sidebar */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route
                path="/"
                element={
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Dashboard />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/dre"
                element={
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Financeiro />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Settings />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/gestao-contratos"
                element={
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <GestaoContratos />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/clientes-ativos"
                element={
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <ClientesAtivosFinanceiro />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/crm"
                element={
                  <RoleProtectedRoute allowedRoles={["admin", "member"]}>
                    <CRM />
                  </RoleProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
