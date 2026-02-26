

## Plano: Nova página "Clientes Ativos" e simplificação do Financeiro

### Resumo
Remover a aba "Contratos" da página Financeiro (manter apenas DRE Gerencial e Despesas) e criar uma nova página dedicada "Clientes Ativos" com UI premium para gestão de contratos, parcelas e comissões.

### Implementação

**1. Simplificar página Financeiro (`src/pages/Financeiro.tsx`)**
- Remover aba "Contratos" do TabsList (manter só DRE e Despesas, grid-cols-2)
- Remover todo o código de contratos: estados (selectedClient, isContractModalOpen, contractProgress, etc.), hooks (useActiveContracts, useCompletedContracts), funções (handleOpenNewContract, handleSelectClient, renderContractCard), dialogs (ClientSelectorDialog, ContractDetailDialog, NewClientForm, ContractBuilder)
- Remover botão "Novo Contrato" do header
- Manter apenas: FinancialSummary, ExpensesTable, NewExpenseDialog

**2. Criar nova página `src/pages/ClientesAtivos.tsx`**
- Header com título "Clientes Ativos" + botão "Novo Contrato"
- KPI cards no topo: Total em Contratos Ativos, Total Recebido, Total Pendente, Contratos Concluídos
- Lista de clientes com cards expandíveis (accordion-style):
  - Cada card mostra: avatar, nome, badge ativo/concluído, valor total, barra de progresso
  - Ao expandir: duas seções lado a lado (ou tabs internas)
    - **Parcelas**: tabela com vencimento, valor, taxa, status, ação de baixa rápida
    - **Comissões**: tabela com beneficiário, %, valor, status, ação de pagamento rápido
- Filtro por status: Todos / Ativos / Concluídos (toggle pills)
- Busca por nome de cliente
- Reutilizar `ContractDetailDialog` para edição completa ao clicar "Ver detalhes"
- Reutilizar `ClientSelectorDialog`, `ContractBuilder`, `NewClientForm` para criação de contratos

**3. Adicionar rota e sidebar**
- `src/App.tsx`: nova rota `/clientes-ativos` com `RoleProtectedRoute` admin-only
- `src/components/layout/AppSidebar.tsx`: novo item "Clientes Ativos" com ícone `UserCheck` entre CRM e Financeiro

**4. Hook dedicado `src/hooks/useClientContracts.ts`**
- Query que busca todos os contratos (ativos + concluídos) com join em clients, installments e commissions
- Agrupa por cliente, calcula totais pagos/pendentes por cliente
- Retorna dados estruturados para a página

### Detalhes técnicos
- Nenhuma alteração de banco de dados necessária - todas as tabelas já existem
- Accordion usa `@radix-ui/react-collapsible` (já instalado)
- Barra de progresso com gradiente dourado (#E8BD27) consistente com o design system
- Ações de baixa rápida (parcela/comissão) reutilizam a mesma lógica do `ContractDetailDialog`
- `checkAndCompleteContract` do `contractService` continua sendo chamado após cada alteração de status

