
-- Fix contracts that are marked as completed but still have unpaid installments
UPDATE contracts SET status = 'active' 
WHERE status = 'completed' 
AND id IN (
  SELECT DISTINCT contract_id FROM installments WHERE status IN ('pending', 'overdue')
);
