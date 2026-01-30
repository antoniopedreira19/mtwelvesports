-- Adicionar campos para reunião e motivo de perda na tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS meeting_date date,
ADD COLUMN IF NOT EXISTS meeting_responsible text,
ADD COLUMN IF NOT EXISTS lost_reason text;