-- ============================================================================
-- Migration: dispatch-expand — move to pg_cron (every 2 minutes)
-- ============================================================================
-- The Vercel cron entry for dispatch-expand was scheduled "0 8 * * *" (once
-- daily) despite the route's own comment claiming "runs every 2 minutes" —
-- Vercel's Hobby plan caps cron at once-per-day, which is why this drifted.
-- vercel.json's dispatch-expand entry has been removed in this same change
-- (see vercel.json diff) so there's only one scheduler driving this route.
--
-- pg_cron is already live in this project (see
-- 20260507000001_stale_urgent_search_cleanup.sql, running '* * * * *') so
-- this uses the same, proven mechanism instead of depending on Vercel's
-- cron tier. pg_net.http_post() calls the EXISTING /api/cron/dispatch-expand
-- route — all the radius-expansion and push-notification logic stays in the
-- already-tested TypeScript code; only who triggers it changes.
--
-- ── ONE-TIME MANUAL STEP REQUIRED ────────────────────────────────────────
-- This migration references a Vault secret named 'cron_secret_token' that
-- does NOT exist yet — create it once via the Supabase SQL editor with your
-- real CRON_SECRET_TOKEN (the same value already set as an env var on
-- Vercel, checked by lib/cron-auth.ts):
--
--   SELECT vault.create_secret(
--     '<paste your real CRON_SECRET_TOKEN value here>',
--     'cron_secret_token',
--     'Bearer token for pg_cron → dispatch-expand authentication'
--   );
--
-- Until that secret exists, the scheduled job will run every 2 minutes but
-- fail auth (visible in cron.job_run_details) — it will start working the
-- moment the secret is created, no re-deploy needed.
--
-- Also update the site URL below (currently defaulting to the same
-- fallback already used in dispatch-urgent/route.ts) if your production
-- domain differs.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '⚠ pg_cron extension not found — enable it in Supabase Dashboard → Database → Extensions, then re-run this migration';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE '⚠ pg_net extension not found — enable it in Supabase Dashboard → Database → Extensions, then re-run this migration';
    RETURN;
  END IF;

  -- Idempotent: skip if already scheduled (matches the pattern used by
  -- stale-search-cleanup).
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-expand') THEN
    PERFORM cron.schedule(
      'dispatch-expand',
      '*/2 * * * *',
      $cron$
        SELECT net.http_post(
          url     := 'https://openjobmarket.com/api/cron/dispatch-expand',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || (
              SELECT decrypted_secret FROM vault.decrypted_secrets
              WHERE name = 'cron_secret_token'
            ),
            'Content-Type', 'application/json'
          ),
          body    := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE '✓ pg_cron job "dispatch-expand" scheduled (every 2 minutes)';
  ELSE
    RAISE NOTICE '· pg_cron job "dispatch-expand" already scheduled — skipping';
  END IF;
END;
$$;

DO $$ BEGIN RAISE NOTICE '✅ Migration 20260715000009 (dispatch-expand pg_cron scheduler) complete'; END; $$;
