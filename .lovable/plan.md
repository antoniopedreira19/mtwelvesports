

## Plano: Aba "Oportunidades" no modal de Clientes Ativos

### 1. Nova tabela `opportunities`

Criar uma tabela no Supabase para armazenar as oportunidades de cada cliente:

```sql
CREATE TYPE public.opportunity_stage AS ENUM (
  'prospecting', 'in_conversation', 'visiting', 'offer', 'committed', 'rejected'
);

CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_name TEXT NOT NULL,
  institution_type TEXT DEFAULT 'university',
  stage opportunity_stage NOT NULL DEFAULT 'prospecting',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
```

- `institution_name`: nome da escola/universidade/time
- `institution_type`: tipo (university, school, team)
- `stage`: estágio do pipeline (Prospectando, Em Conversa, Visitando, Offer, Committed, Rejected)
- `client_id`: vínculo obrigatório com o cliente ativo
- `user_id`: preenchido automaticamente se o cliente estiver vinculado a um user

RLS: authenticated users full access (mesmo padrão das demais tabelas).

### 2. Alterações no modal do ClientCard (ActiveClientsTab.tsx)

- Adicionar abas `Tabs` (Radix) dentro do `DialogContent` do modal: **Informações** (conteúdo atual) e **Oportunidades** (nova aba).
- O header do modal (avatar + nome) permanece fora das abas.

### 3. Aba Oportunidades - UI

- Botão "Nova Oportunidade" abre um form inline ou mini-dialog para adicionar (nome da instituição, tipo, estágio).
- Lista de oportunidades com cards mostrando: nome da instituição, badge do estágio com cores distintas, notas.
- Ações: editar estágio (select inline), editar notas, excluir.
- Estágios com cores: Prospectando (cinza), Em Conversa (azul), Visitando (roxo), Offer (amber), Committed (verde), Rejected (vermelho).

### 4. Hook `useOpportunities`

- Novo hook para CRUD de oportunidades filtrado por `client_id`.
- Ao criar uma oportunidade, se o cliente tiver `user_id`, preencher automaticamente o campo `user_id` da oportunidade.

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| Nova migration SQL | Criar tabela `opportunities` + enum + RLS |
| `src/hooks/useOpportunities.ts` | Novo hook CRUD |
| `src/components/modules/financial/ActiveClientsTab.tsx` | Adicionar Tabs no modal, nova aba Oportunidades |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |

