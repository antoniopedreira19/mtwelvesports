

## Plano: Nova aba "Clientes Ativos" na página DRE

### 1. Migração SQL — Novos campos na tabela `clients`

Adicionar campos para informações de pagador:

```sql
ALTER TABLE clients ADD COLUMN payer_name text;
ALTER TABLE clients ADD COLUMN payer_email text;
ALTER TABLE clients ADD COLUMN payer_phone text;
ALTER TABLE clients ADD COLUMN payer_relationship text DEFAULT 'self'; -- 'self', 'parent', 'guardian', 'other'
ALTER TABLE clients ADD COLUMN payment_method text; -- 'pix', 'transfer', 'credit_card', 'boleto'
```

### 2. Novo componente `ActiveClientsTab`

`src/components/modules/financial/ActiveClientsTab.tsx`

- Hook `useClientContracts` já existente traz clientes com contratos ativos/completed
- Buscar também dados do cliente (email, phone, payer_*) via query adicional
- Layout: lista de cards expansíveis, um por cliente ativo

**Cada card do cliente mostra:**
- Header: Avatar, Nome, Escola, Badge de status (ativo/concluído)
- Seção "Dados do Pagador": nome do pagador, email, telefone, relacionamento (ele mesmo / parente), método de pagamento — editáveis inline
- Seção "Contrato": valor total, total pago, total pendente (dados do hook existente), dia de vencimento
- Seção "Documentos": placeholder para upload futuro (MVP mostra área vazia com ícone)

**UI Premium:**
- Cards com `rounded-2xl`, `shadow-sm`, hover elevation
- Accordion/Collapsible para expandir detalhes
- Ícones contextuais (User, Mail, Phone, CreditCard, FileText)
- Badges coloridos para status de pagamento
- Botão de edição inline para dados do pagador

### 3. Atualizar `Financeiro.tsx`

- Adicionar terceira tab "Clientes Ativos" no TabsList (grid-cols-3)
- Importar e renderizar `ActiveClientsTab` no novo `TabsContent`
- Atualizar subtítulo da página

### 4. Resumo dos arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | Adicionar 5 colunas de pagador na tabela `clients` |
| `src/components/modules/financial/ActiveClientsTab.tsx` | **Novo** — componente da aba |
| `src/pages/Financeiro.tsx` | Adicionar terceira tab |

