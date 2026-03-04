
-- Create enum for opportunity stages
CREATE TYPE public.opportunity_stage AS ENUM (
  'prospecting', 'in_conversation', 'visiting', 'offer', 'committed', 'rejected'
);

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL DEFAULT 'university',
  stage opportunity_stage NOT NULL DEFAULT 'prospecting',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other tables)
CREATE POLICY "Authenticated users can view opportunities"
  ON public.opportunities FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create opportunities"
  ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update opportunities"
  ON public.opportunities FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete opportunities"
  ON public.opportunities FOR DELETE TO authenticated
  USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
