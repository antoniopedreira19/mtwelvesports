-- Add installment_id to commissions table for linking commissions to specific installments
ALTER TABLE public.commissions 
ADD COLUMN installment_id uuid REFERENCES public.installments(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_commissions_installment_id ON public.commissions(installment_id);