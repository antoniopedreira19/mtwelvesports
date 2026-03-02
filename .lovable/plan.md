

## Plano: Agrupar comissões por mês na página Gestão de Contratos

### Contexto
Na página `/gestao-contratos`, ao expandir um cliente e acessar a aba "Comissões", todas as comissões aparecem em uma lista plana. O objetivo é agrupá-las por mês (usando a data de pagamento da parcela vinculada), seguindo o mesmo padrão visual já usado no `ContractDetailDialog`.

### Alteração

**Arquivo: `src/pages/ClientesAtivos.tsx`** (função `renderClientCard`, aba `comissoes`, linhas ~462-487)

1. Criar a lógica de agrupamento por mês: para cada comissão em `allCommissions`, buscar a parcela vinculada via `installmentId` e usar seu `paymentDate` para determinar o mês. Agrupar em um `Map<string, { label, items }>` e ordenar cronologicamente.

2. Substituir a tabela única por iteração sobre os grupos mensais, cada um com:
   - Cabeçalho com o nome do mês (ex: "Janeiro 2025") e um `Badge` com o total do mês
   - Tabela individual com as comissões daquele mês (mesmas colunas: Beneficiário, %, Valor, Status, Ação)

O visual seguirá o padrão do `ContractDetailDialog`: um `div` por grupo com título + badge de total, e tabela com borda arredondada abaixo.

### Detalhes técnicos
- A data de cada comissão será resolvida buscando a parcela com mesmo `id` em `allInstallments` (já disponível no escopo)
- Formato do mês: `format(date, "MMMM yyyy", { locale: ptBR })` com capitalização
- Comissões sem parcela vinculada serão agrupadas sob o mês da `created_at` ou um grupo "Sem data"

