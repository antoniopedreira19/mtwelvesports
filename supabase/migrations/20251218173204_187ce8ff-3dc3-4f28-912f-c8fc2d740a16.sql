-- Create enum for client pipeline stages
CREATE TYPE public.pipeline_stage AS ENUM ('radar', 'contato', 'negociacao', 'fechado', 'perdido');

-- Create enum for contract status
CREATE TYPE public.contract_status AS ENUM ('draft', 'active', 'completed', 'cancelled');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Create enum for transaction type
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  club TEXT,
  position TEXT,
  stage pipeline_stage NOT NULL DEFAULT 'radar',
  value DECIMAL(15,2) DEFAULT 0,
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  total_value DECIMAL(15,2) NOT NULL,
  status contract_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create installments table (split payments)
CREATE TABLE public.installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  employee_name TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  description TEXT NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table (for commission tracking)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can CRUD all data
-- Clients policies
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

-- Contracts policies
CREATE POLICY "Authenticated users can view contracts" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contracts" ON public.contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contracts" ON public.contracts FOR DELETE TO authenticated USING (true);

-- Installments policies
CREATE POLICY "Authenticated users can view installments" ON public.installments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create installments" ON public.installments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update installments" ON public.installments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete installments" ON public.installments FOR DELETE TO authenticated USING (true);

-- Commissions policies
CREATE POLICY "Authenticated users can view commissions" ON public.commissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create commissions" ON public.commissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update commissions" ON public.commissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete commissions" ON public.commissions FOR DELETE TO authenticated USING (true);

-- Transactions policies
CREATE POLICY "Authenticated users can view transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete transactions" ON public.transactions FOR DELETE TO authenticated USING (true);

-- Employees policies
CREATE POLICY "Authenticated users can view employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update employees" ON public.employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete employees" ON public.employees FOR DELETE TO authenticated USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();