-- Configurar view como SECURITY INVOKER (usa permissões do usuário que consulta)
ALTER VIEW public.financial_overview SET (security_invoker = on);