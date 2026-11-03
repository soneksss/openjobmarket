-- ============================================================
-- Per-job currency
-- Each trade job / vacancy keeps the currency it was posted in, so
-- amounts are shown as posted and never converted. Existing jobs
-- were all posted in pounds, so they default to GBP.
-- ============================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP';

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_currency_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_currency_check CHECK (currency IN ('GBP', 'USD', 'EUR', 'CAD', 'AUD'));

-- Check: one row per currency in use (all GBP to start with).
SELECT currency, count(*) AS jobs FROM public.jobs GROUP BY currency;
