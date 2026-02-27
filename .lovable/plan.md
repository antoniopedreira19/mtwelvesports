

## Plano: Separar "Data de Pagamento" e "Dia de Vencimento"

### Conceito
- **`due_date`** (coluna atual na tabela `installments`) → renomear para **`payment_date`** (data de pagamento — quando o pagamento efetivamente acontece/aconteceu)
- **`due_day`** (nova coluna na tabela `contracts`) → inteiro (1-31), dia fixo de vencimento mensal que se aplica a todas as parcelas do contrato (ex: 20 = todo dia 20)
- A aba **Cobranças** passa a usar o `due_day` do contrato + mês da parcela para calcular se está vencido

---

### 1. Migração SQL (3 operações)

**a) Renomear coluna `due_date` → `payment_date` na tabela `installments`:**
```sql
ALTER TABLE installments RENAME COLUMN due_date TO payment_date;
```

**b) Adicionar coluna `due_day` na tabela `contracts`:**
```sql
ALTER TABLE contracts ADD COLUMN due_day integer DEFAULT 20;
```

**c) Recriar a view `financial_overview`** substituindo todas as referências de `i.due_date` por `i.payment_date` e `e.due_date` (expenses mantém `due_date`)

**d) Atualizar todos os contratos ativos existentes:**
```sql
UPDATE contracts SET due_day = 20 WHERE status = 'active';
```

---

### 2. Arquivos do frontend a alterar

**Todos os arquivos que referenciam `due_date` de installments** (6 arquivos):

| Arquivo | Mudança |
|---------|---------|
| `src/types/index.ts` | `Installment.due_date` → `payment_date` |
| `src/services/contractService.ts` | Todas refs `due_date` → `payment_date` em installments |
| `src/hooks/useClientContracts.ts` | `i.due_date` → `i.payment_date`; adicionar `dueDay` do contrato |
| `src/components/modules/financial/ContractBuilder.tsx` | `due_date` → `payment_date`; adicionar campo "Dia de Vencimento" (input numérico 1-31) que é passado no `onSave` |
| `src/components/modules/financial/ContractDetailDialog.tsx` | `due_date` → `payment_date` em todas refs; adicionar campo editável "Dia de Vencimento" no header do contrato |
| `src/components/modules/financial/EditContractDialog.tsx` | `due_date` → `payment_date`; incluir campo `due_day` |
| `src/pages/ClientesAtivos.tsx` | Renomear `dueDate` → `paymentDate` no hook data; aba Cobranças: calcular vencimento usando `due_day` do contrato + mês da parcela em vez de `dueDate` |
| `src/components/modules/financial/FinancialSummary.tsx` | Sem mudança direta (usa `financial_overview` view que será atualizada na migration) |

### 3. Lógica da aba Cobranças (mudança principal)

Atualmente usa `inst.dueDate` para determinar mês e atraso. Nova lógica:
- Para cada parcela pendente, o "vencimento" é: `new Date(ano_parcela, mes_parcela - 1, contract.due_day)`
- Se hoje > essa data e status !== "paid" → vencido
- Agrupar por mês usando a `payment_date` da parcela (mês em que o pagamento está programado)

### 4. Labels na UI

- Coluna "Vencimento" na tabela de parcelas → "Data Pagamento"
- Novo campo "Dia de Vencimento" no header do contrato (editável, numérico)
- No `ContractBuilder`: novo input "Dia de Vencimento" no grid de configuração

