

## Plano: Adicionar botão "Adicionar Parcela" no dialog de edição de contrato

### Problema
O `ContractDetailDialog` (dialog de editar contrato) não possui botão para adicionar novas parcelas. Só existe essa funcionalidade no `ContractBuilder` (criação de contrato).

### Implementação

**Arquivo: `src/components/modules/financial/ContractDetailDialog.tsx`**

1. **Criar função `addNewInstallment`** que:
   - Calcula a próxima data de vencimento (+1 mês da última parcela existente)
   - Usa a taxa padrão da última parcela existente (ou 0)
   - Insere a nova parcela no Supabase com `contract_id`, `value: 0`, `status: "pending"`, `due_date` e `transaction_fee`
   - Cria comissões vinculadas (se houver comissões no contrato, replica os mesmos beneficiários/percentuais)
   - Atualiza o `total_value` do contrato e o `installments_count`
   - Faz optimistic update no estado local e recarrega os dados

2. **Adicionar botão "Adicionar Parcela"** após o `</Table>` (depois da linha ~578), dentro da tab de parcelas:
   - Botão com estilo `variant="outline"`, `border-dashed`, ícone `Plus`
   - Texto: "Adicionar Parcela"
   - Ao clicar, chama `addNewInstallment`

3. **Após inserir**, entra automaticamente em modo de edição da nova parcela para o usuário ajustar valor, data e taxa.

### Detalhes técnicos
- Insert no Supabase: tabela `installments` com `contract_id`, `value`, `due_date`, `status`, `transaction_fee`
- Update no Supabase: tabela `contracts` campo `total_value` (soma de todas parcelas) e `installments_count`
- Criar comissões vinculadas na tabela `commissions` para cada beneficiário existente no contrato
- Importar `Plus` de `lucide-react` (já importado? verificar) — não está importado, adicionar
- Importar `addMonths` de `date-fns` — não está importado, adicionar

