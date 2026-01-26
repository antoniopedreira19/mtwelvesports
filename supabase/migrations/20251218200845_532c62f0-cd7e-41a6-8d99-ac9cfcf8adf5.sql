-- Dropar e recriar view com tipos consistentes
DROP VIEW IF EXISTS public.financial_overview;

CREATE VIEW public.financial_overview AS
SELECT 
    i.id,
    i.contract_id,
    'Receita - ' || cl.name AS title,
    'receita' AS type,
    'entrada' AS direction,
    i.value AS amount,
    i.due_date::timestamp with time zone AS date,
    i.status::text AS status,
    i.created_at
FROM installments i
JOIN contracts c ON i.contract_id = c.id
JOIN clients cl ON c.client_id = cl.id

UNION ALL

SELECT 
    e.id,
    NULL::uuid AS contract_id,
    e.description AS title,
    e.category::text AS type,
    'saida' AS direction,
    e.amount,
    e.due_date::timestamp with time zone AS date,
    e.status::text AS status,
    e.created_at
FROM expenses e

UNION ALL

SELECT 
    com.id,
    com.contract_id,
    'Comissão - ' || com.employee_name AS title,
    'comissao' AS type,
    'saida' AS direction,
    com.value AS amount,
    COALESCE(inst.due_date::timestamp with time zone, com.created_at) AS date,
    'pending' AS status,
    com.created_at
FROM commissions com
LEFT JOIN installments inst ON com.installment_id = inst.id;