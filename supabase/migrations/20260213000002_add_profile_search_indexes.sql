-- Migration: Add performance indexes for profile searches
-- Date: 2026-02-13
-- Description: Adds indexes to speed up contractor and professional profile searches
-- These queries were timing out due to missing indexes on filtered columns

-- ============================================================================
-- CONTRACTOR PROFILES INDEXES
-- ============================================================================

-- Index for location-based queries (latitude/longitude filtering)
CREATE INDEX IF NOT EXISTS idx_contractor_profiles_location
ON contractor_profiles(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for industry filtering (used in trade category filter)
CREATE INDEX IF NOT EXISTS idx_contractor_profiles_industry
ON contractor_profiles(industry);

-- Index for 24/7 availability filter
CREATE INDEX IF NOT EXISTS idx_contractor_profiles_available_247
ON contractor_profiles(available_247)
WHERE available_247 = true;

-- GIN index for languages array search
CREATE INDEX IF NOT EXISTS idx_contractor_profiles_languages
ON contractor_profiles USING GIN (languages);

-- ============================================================================
-- PROFESSIONAL PROFILES INDEXES
-- ============================================================================

-- Index for location-based queries (latitude/longitude filtering)
CREATE INDEX IF NOT EXISTS idx_professional_profiles_location
ON professional_profiles(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for visibility filter (correct column name: profile_visible)
CREATE INDEX IF NOT EXISTS idx_professional_profiles_visible
ON professional_profiles(profile_visible)
WHERE profile_visible = true;

-- Index for available_for_work filter
CREATE INDEX IF NOT EXISTS idx_professional_profiles_available
ON professional_profiles(available_for_work)
WHERE available_for_work = true;

-- Index for self-employed filter
CREATE INDEX IF NOT EXISTS idx_professional_profiles_self_employed
ON professional_profiles(is_self_employed)
WHERE is_self_employed = true;

-- Composite index for common search pattern (visible + available + location)
CREATE INDEX IF NOT EXISTS idx_professional_profiles_search
ON professional_profiles(profile_visible, available_for_work, latitude, longitude)
WHERE profile_visible = true AND available_for_work = true AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- GIN index for skills array search
CREATE INDEX IF NOT EXISTS idx_professional_profiles_skills
ON professional_profiles USING GIN (skills);

-- ============================================================================
-- COMPANY PROFILES INDEXES
-- ============================================================================

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_company_profiles_location
ON company_profiles(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for open_for_business filter (correct column name)
CREATE INDEX IF NOT EXISTS idx_company_profiles_open_business
ON company_profiles(open_for_business)
WHERE open_for_business = true;

-- Index for is_tradespeople filter (if this column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'is_tradespeople'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_company_profiles_tradespeople
    ON company_profiles(is_tradespeople)
    WHERE is_tradespeople = true;
  END IF;
END $$;

-- Index for industry filtering
CREATE INDEX IF NOT EXISTS idx_company_profiles_industry
ON company_profiles(industry);

-- GIN index for services array search (if services column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'services'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_company_profiles_services
    ON company_profiles USING GIN (services);
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  contractor_idx_count INTEGER;
  professional_idx_count INTEGER;
  company_idx_count INTEGER;
BEGIN
  -- Count indexes
  SELECT COUNT(*) INTO contractor_idx_count
  FROM pg_indexes
  WHERE tablename = 'contractor_profiles'
    AND indexname LIKE 'idx_contractor_profiles_%';

  SELECT COUNT(*) INTO professional_idx_count
  FROM pg_indexes
  WHERE tablename = 'professional_profiles'
    AND indexname LIKE 'idx_professional_profiles_%';

  SELECT COUNT(*) INTO company_idx_count
  FROM pg_indexes
  WHERE tablename = 'company_profiles'
    AND indexname LIKE 'idx_company_profiles_%';

  RAISE NOTICE 'Created % indexes on contractor_profiles', contractor_idx_count;
  RAISE NOTICE 'Created % indexes on professional_profiles', professional_idx_count;
  RAISE NOTICE 'Created % indexes on company_profiles', company_idx_count;
END $$;
