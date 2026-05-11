-- ============================================================
-- Compound indexes for viewport bounding-box queries.
-- These replace full-table scans when the map API filters
-- by lat/lng range (WHERE lat BETWEEN $s AND $n AND ...).
-- ============================================================

-- seeded_trades: already has idx_seeded_trades_latlng (lat, lng)
-- and idx_seeded_trades_claimed — ensure they exist
CREATE INDEX IF NOT EXISTS idx_seeded_trades_latlng
  ON public.seeded_trades (lat, lng);

CREATE INDEX IF NOT EXISTS idx_seeded_trades_claimed
  ON public.seeded_trades (claimed);

-- company_profiles: add compound lat/lng index if missing
CREATE INDEX IF NOT EXISTS idx_company_profiles_latlng
  ON public.company_profiles (latitude, longitude);

-- Partial index — only rows that can appear on the map
CREATE INDEX IF NOT EXISTS idx_company_profiles_latlng_not_null
  ON public.company_profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

DO $$ BEGIN
  RAISE NOTICE '✓ Viewport bounding-box indexes created';
END $$;
