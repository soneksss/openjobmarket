-- ============================================================
-- Feature: Online Presence — Google & Facebook links
-- ============================================================
-- Free, zero-API-cost version: tradespeople paste their own Google
-- Business/Maps link and Facebook Page link. No live data import (Google
-- Places API requires a billing account; dropped in favour of this).
-- Displayed as "View on Google" / "Visit Facebook" buttons on the public
-- profile so customers can click through and see reviews themselves.
-- ============================================================

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url    TEXT;

DO $$ BEGIN RAISE NOTICE '✅ Migration 20260715000010 (Google/Facebook profile links) complete'; END; $$;
