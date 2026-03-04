

## Diagnóstico

O problema é uma combinação de dois fatores:

1. **A rota `/crm` não tem proteção de role** (linha 74 do App.tsx): qualquer usuário autenticado pode acessá-la, incluindo clientes.
2. **Race condition no redirecionamento**: quando o `useUserRole` falha ou demora a carregar, o fallback é `"member"`. Como `"member"` não está em `allowedRoles: ["client"]` na rota `/athlete-portal`, o `RoleProtectedRoute` redireciona para o `fallbackPath="/crm"` — que não tem proteção nenhuma e aceita o usuário.
3. **A sidebar não diferencia clientes**: mostra apenas itens filtrados por `adminOnly`, mas não esconde itens de clientes.

## Plano de Correção

### 1. Proteger a rota `/crm` (App.tsx)
Envolver a rota `/crm` com `RoleProtectedRoute allowedRoles={["admin", "member"]}` para que clientes não possam acessá-la.

### 2. Ajustar sidebar para clientes (AppSidebar.tsx)
- Detectar se o usuário é `client` via `useUserRole`
- Se for cliente, mostrar apenas o link "Portal do Atleta" (`/athlete-portal`) na sidebar, escondendo CRM e as demais rotas internas

### 3. Ajustar fallback do `/athlete-portal` (App.tsx)
Alterar o `fallbackPath` da rota `/athlete-portal` de `"/crm"` para `"/"` — assim, se um não-cliente tentar acessar, vai para o dashboard (que por sua vez redireciona conforme a role).

### 4. Ajustar redirecionamento padrão para clientes (RoleProtectedRoute.tsx)
Garantir que o fallback padrão (`fallbackPath = "/crm"`) também considere clientes — já existe a lógica `role === "client" ? "/athlete-portal"`, mas o ideal é que a rota raiz `/` redirecione corretamente para `/athlete-portal` quando a role for `client`.

Essas 4 alterações resolvem o problema de forma completa e garantem que clientes fiquem restritos ao portal.

