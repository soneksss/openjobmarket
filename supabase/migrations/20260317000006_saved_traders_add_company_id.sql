-- Add company_id to saved_traders so homeowners can save tradesperson profiles
-- (company_profiles represent tradespeople in the post-2-role migration)

ALTER TABLE public.saved_traders
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE;

-- Index for fast lookup: which companies has a homeowner saved?
CREATE INDEX IF NOT EXISTS idx_saved_traders_homeowner_company
ON public.saved_traders (homeowner_id, company_id);

-- RLS: homeowners can manage their own rows (existing policy covers INSERT/DELETE/SELECT by homeowner)
-- No policy changes needed — the existing policies on saved_traders already cover all rows
-- owned by the homeowner_id.
