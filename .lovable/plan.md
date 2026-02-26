

## Plano: Aba "Cobranças" na página Gestão de Contratos

### Objetivo
Adicionar uma aba "Cobranças" na página Gestão de Contratos com uma lista de clientes que possuem parcelas pendentes/vencidas, filtrável por mês.

### Implementação

**Arquivo: `src/pages/ClientesAtivos.tsx`**

1. **Envolver o conteúdo atual em um sistema de abas de nível superior** (Tabs):
   - Aba "Contratos" — conteúdo atual (KPIs, filtros, lista de clientes)
   - Aba "Cobranças" — nova aba

2. **Nova aba "Cobranças"**:
   - **Filtro de mês**: Select com os meses disponíveis (baseado nos `dueDate` das parcelas pendentes/vencidas), default = mês atual
   - **KPI cards mini**: Total a cobrar no mês, Quantidade de clientes, Parcelas vencidas (overdue)
   - **Lista de clientes com parcelas pendentes/vencidas no mês selecionado**:
     - Cada item mostra: avatar, nome do cliente, escola, quantidade de parcelas pendentes, valor total pendente no mês
     - Parcelas listadas inline abaixo de cada cliente (sem accordion — direto visível) com: vencimento, valor, status badge (pendente/vencido), botão de baixa rápida
     - Parcelas vencidas (overdue) com destaque visual em vermelho
   - Clientes ordenados: vencidos primeiro, depois pendentes

3. **Dados**: Reutilizar o hook `useClientContracts` já existente — filtrar no frontend as parcelas com status `pending` ou `overdue` cujo `dueDate` cai no mês selecionado.

4. **UI/UX**:
   - Tabs no topo da página, estilo consistente com o design system (dourado ativo)
   - Cards de cobrança com borda lateral colorida (vermelho para vencido, âmbar para pendente)
   - Botão "Baixar" com ação rápida (reutilizar `quickPayInstallment`)
   - Empty state quando não há cobranças no mês

### Layout esperado
```text
[Contratos]  [Cobranças]

Filtro: [Fevereiro 2026 ▼]

┌─ KPI: R$ 15.000 a cobrar  |  5 clientes  |  2 vencidos ─┐

┌ 🔴 João Silva — Escola X
│   15/02 — R$ 3.000 — Vencido  [Baixar]
│   28/02 — R$ 2.000 — Pendente [Baixar]

┌ 🟡 Maria Santos — Escola Y  
│   20/02 — R$ 5.000 — Pendente [Baixar]
```

