-- Fix trader map search performance.
--
-- Problems solved:
-- 1. professional_profiles: missing is_self_employed in composite index caused full table scan
-- 2. company_profiles: no composite index covering (latitude, longitude) for fast bounding box queries

-- Drop old partial index that excluded is_self_employed
DROP INDEX IF EXISTS idx_professional_profiles_search;

-- New composite index covers the exact filter set used by the traders query:
--   profile_visible = true, available_for_work = true, is_self_employed = true, lat/lon not null
CREATE INDEX IF NOT EXISTS idx_professional_profiles_trader_search
  ON professional_profiles(latitude, longitude)
  WHERE profile_visible = true
    AND available_for_work = true
    AND is_self_employed = true
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL;

-- company_profiles: composite covering index for bounding box + has coords
CREATE INDEX IF NOT EXISTS idx_company_profiles_trader_search
  ON company_profiles(latitude, longitude)
  WHERE latitude IS NOT NULL
    AND longitude IS NOT NULL;
