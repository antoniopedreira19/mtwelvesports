

## Plano: UI/UX Premium para destaque da Matriz DRE

### Mudanças no arquivo `src/components/modules/financial/FinancialSummary.tsx`

**1. Cards KPI mais compactos** (linhas 344-448)
- Reduzir padding dos cards (`p-3` em vez de `p-4`)
- Diminuir tamanho do valor principal (`text-lg` em vez de `text-xl`)
- Manter toda a informação, apenas mais condensado para dar espaço visual à matriz

**2. Matriz DRE com destaque premium** (linhas 450-655)
- Remover o wrapper `Card` da matriz e usar um container customizado com gradiente sutil de borda
- Adicionar um header mais imponente com título maior (`text-xl font-bold`), um ícone decorativo e uma linha de gradiente colorida no topo (emerald → yellow → red representando receita → resultado → despesa)
- Aplicar `rounded-2xl` com `ring-1 ring-border/30` e `shadow-lg` para elevação visual
- Adicionar padding interno mais generoso
- Linha de RESULTADO com background gradiente sutil (do amarelo dourado) para destaque visual
- Espaçamento maior entre cards e matriz (`space-y-8` em vez de `space-y-6`)
- Linhas da tabela com hover mais pronunciado e transição suave
- Coluna "Item" com tipografia mais forte nas categorias principais

**3. Barra de gradiente decorativa no topo da matriz**
- Div com `h-1 bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 rounded-t-2xl`
- Reforça visualmente o conceito de DRE (receita → resultado → despesa)

### Resultado esperado
Cards compactos na parte superior como resumo rápido, e a Matriz DRE ocupando o papel principal da página com aparência de dashboard premium, borda decorativa e elevação visual.

