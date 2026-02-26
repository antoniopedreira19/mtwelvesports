
Objetivo: corrigir definitivamente o espaçamento da Matriz DRE para que, com 1 mês filtrado, os valores fiquem próximos de “Receitas/Comissões/Despesas/Resultado”, e ao adicionar meses as colunas cresçam para a direita.

Travas atuais (por que ainda não ficou certo):
1) O componente `Table` base força `w-full` no `<table>`, então a tabela ocupa toda a largura e “empurra” a coluna Item.
2) A coluna Item está sem largura controlada no header/body, então ela absorve o espaço sobrando.
3) As células da primeira coluna usam `flex` direto no `TableCell`, o que atrapalha o comportamento natural de coluna de tabela.
4) Houve ajustes parciais conflitantes (ora `table-fixed`, ora removido), sem travar um modelo único de largura.

Plano de implementação:
1) Em `FinancialSummary.tsx`, aplicar estratégia de largura por conteúdo na Matriz DRE:
   - usar `<Table className="relative w-max min-w-0 table-auto">` para sobrescrever o `w-full` padrão.
2) Fixar largura da coluna Item (header + todas as células sticky da primeira coluna):
   - `w-[220px] min-w-[220px] max-w-[220px]` (ajustável fino depois).
3) Padronizar larguras das colunas de mês e AH% (header e body):
   - mês: `w-[130px] min-w-[130px]`
   - AH%: `w-[50px] min-w-[50px]`
4) Remover `flex` do `TableCell` da primeira coluna e mover para um wrapper interno (`div`) para preservar layout de tabela.
5) Garantir que sticky continue correto:
   - manter fundos opacos `bg-table-*` e `z-index` atuais.
6) Validar comportamento visual em 3 cenários:
   - 1 mês: valores colados próximos ao Item.
   - 2–4 meses: novas colunas aparecendo progressivamente à direita.
   - com linhas expandidas (itens internos) e rolagem horizontal.

Layout esperado:
```text
| Item (fixo 220px) | Fev (130) | AH% (50) | Mar (130) | AH% (50) | ...
^ fica próximo quando há 1 mês
^ cresce para direita conforme adiciona meses
```

Detalhes técnicos (implementação objetiva):
- Arquivo: `src/components/modules/financial/FinancialSummary.tsx`
- Bloco alvo: tabela “Matriz DRE” (header + linhas Receitas/Comissões/Despesas/Resultado + sublinhas expandidas).
- Não alterar `src/components/ui/table.tsx` globalmente para evitar impacto nas outras telas.
- Opcional de robustez: aplicar `truncate` em títulos longos da coluna Item para não reabrir espaçamento excessivo.
