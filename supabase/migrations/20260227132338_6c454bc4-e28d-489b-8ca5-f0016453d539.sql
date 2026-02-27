
-- 1. Rename due_date → payment_date in installments
ALTER TABLE installments RENAME COLUMN due_date TO payment_date;

-- 2. Add due_day column to contracts
ALTER TABLE contracts ADD COLUMN due_day integer DEFAULT 20;

-- 3. Set due_day=20 for all active contracts
UPDATE contracts SET due_day = 20 WHERE status = 'active';

-- 4. Recreate financial_overview view with payment_date
DROP VIEW IF EXISTS financial_overview;

CREATE VIEW financial_overview AS
SELECT i.id::text AS id,
    i.contract_id,
    cl.name AS title,
    'installment'::text AS type,
    'entrada'::text AS direction,
    i.value AS amount,
    i.payment_date AS date,
    i.status,
    i.created_at
   FROM installments i
     JOIN contracts c ON i.contract_id = c.id
     JOIN clients cl ON c.client_id = cl.id
UNION ALL
 SELECT e.id::text AS id,
    NULL::uuid AS contract_id,
    e.description AS title,
    'expense'::text AS type,
    'saida'::text AS direction,
    e.amount,
    e.due_date AS date,
    e.status,
    e.created_at
   FROM expenses e
UNION ALL
 SELECT cm.id::text AS id,
    cm.contract_id,
    concat('Comissão: ', cm.employee_name) AS title,
    'comissao'::text AS type,
    'saida'::text AS direction,
    cm.value AS amount,
    i.payment_date AS date,
    cm.status,
    cm.created_at
   FROM commissions cm
     JOIN installments i ON cm.installment_id = i.id
  WHERE cm.installment_id IS NOT NULL
UNION ALL
 SELECT (cm.id || '_'::text) || i.id AS id,
    cm.contract_id,
    concat('Comissão: ', cm.employee_name) AS title,
    'comissao'::text AS type,
    'saida'::text AS direction,
    (i.value / NULLIF(ct.total_value, 0::numeric) * cm.value)::numeric(15,2) AS amount,
    i.payment_date AS date,
    cm.status,
    cm.created_at
   FROM commissions cm
     JOIN contracts ct ON cm.contract_id = ct.id
     JOIN installments i ON cm.contract_id = i.contract_id
  WHERE cm.installment_id IS NULL
UNION ALL
 SELECT i.id || '_tax'::text AS id,
    i.contract_id,
    'Taxa de Transação'::text AS title,
    'taxa'::text AS type,
    'saida'::text AS direction,
    i.transaction_fee AS amount,
    i.payment_date AS date,
    i.status,
    i.created_at
   FROM installments i
  WHERE i.transaction_fee > 0::numeric;
