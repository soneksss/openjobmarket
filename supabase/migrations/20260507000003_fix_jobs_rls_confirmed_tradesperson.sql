-- The jobs_select policy didn't include confirmed_tradesperson_id, so tradespeople
-- who were confirmed for a job couldn't read it through the regular client
-- (the badge function uses SECURITY DEFINER and bypassed RLS, causing the mismatch).

DROP POLICY IF EXISTS "jobs_select" ON public.jobs;

CREATE POLICY "jobs_select"
  ON public.jobs FOR SELECT
  USING (
    is_active = true
    OR company_id              IN (SELECT id FROM company_profiles   WHERE user_id = auth.uid())
    OR homeowner_id            IN (SELECT id FROM homeowner_profiles WHERE user_id = auth.uid())
    OR confirmed_tradesperson_id IN (SELECT id FROM company_profiles WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  RAISE NOTICE '✓ jobs_select now includes confirmed_tradesperson_id clause';
END $$;
