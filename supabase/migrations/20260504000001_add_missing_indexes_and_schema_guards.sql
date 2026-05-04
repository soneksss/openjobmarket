-- ============================================================
-- Migration: Add missing indexes + ensure required columns
-- Date: 2026-05-04
-- Fixes:
--   1. Missing indexes on messages, notifications, jobs lat/lon
--   2. Ensure required columns exist (idempotent ADD IF NOT EXISTS)
-- ============================================================

-- ── 1. Messages indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id
  ON public.messages (recipient_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages (conversation_id);

-- ── 2. Notifications index ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id);

-- ── 3. Jobs geospatial index ─────────────────────────────────
-- Enables fast bounding-box queries on the map feed.
CREATE INDEX IF NOT EXISTS idx_jobs_lat_lon
  ON public.jobs (latitude, longitude);

-- Partial index: only index trade jobs with valid coordinates
-- (the majority of bounding-box queries are for is_tradespeople_job = true)
CREATE INDEX IF NOT EXISTS idx_jobs_trade_lat_lon
  ON public.jobs (latitude, longitude)
  WHERE is_tradespeople_job = true
    AND latitude  IS NOT NULL
    AND longitude IS NOT NULL;

-- ── 4. jobs — ensure required columns exist ──────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS latitude              DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS poster_company_name   TEXT,
  ADD COLUMN IF NOT EXISTS is_tradespeople_job   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS urgency_type          TEXT;

-- Ensure check constraint is present (idempotent — drop+recreate)
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_urgency_type_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_urgency_type_check
  CHECK (urgency_type IS NULL OR urgency_type IN ('asap', 'today', 'flexible'));

-- ── 5. homeowner_profiles — ensure location columns exist ────
ALTER TABLE public.homeowner_profiles
  ADD COLUMN IF NOT EXISTS latitude          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS latitude_approx   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude_approx  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address_line1     TEXT,
  ADD COLUMN IF NOT EXISTS city              TEXT,
  ADD COLUMN IF NOT EXISTS location          TEXT;

-- ── 6. users — ensure required columns exist ─────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_type  TEXT,
  ADD COLUMN IF NOT EXISTS full_name  TEXT;

-- Backfill user_type from account_type where missing
UPDATE public.users
SET user_type = account_type
WHERE user_type IS NULL
  AND account_type IS NOT NULL;

-- ── 7. Verify ────────────────────────────────────────────────
DO $$
DECLARE
  missing TEXT := '';
BEGIN
  -- Check messages indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_sender_id')    THEN missing := missing || ' idx_messages_sender_id'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_recipient_id') THEN missing := missing || ' idx_messages_recipient_id'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_conversation_id') THEN missing := missing || ' idx_messages_conversation_id'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_id') THEN missing := missing || ' idx_notifications_user_id'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_lat_lon')          THEN missing := missing || ' idx_jobs_lat_lon'; END IF;

  IF missing = '' THEN
    RAISE NOTICE '✓ All indexes created successfully';
  ELSE
    RAISE WARNING 'Some indexes may be missing:%', missing;
  END IF;
END $$;
