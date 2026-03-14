-- ============================================================
-- Migration: Create job_skips table
-- ============================================================
-- Tradespeople can skip urgent job notifications.
-- Skipped jobs are excluded from future urgent alerts
-- but remain visible on the map feed.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.job_skips (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id     UUID        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (job_id, user_id)
);

ALTER TABLE public.job_skips ENABLE ROW LEVEL SECURITY;

-- Users can only read/insert their own skips
CREATE POLICY "job_skips_own"
  ON public.job_skips
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_job_skips_user_id ON public.job_skips (user_id);
CREATE INDEX IF NOT EXISTS idx_job_skips_job_id  ON public.job_skips (job_id);

DO $$ BEGIN
  RAISE NOTICE '✓ job_skips table created';
END; $$;
