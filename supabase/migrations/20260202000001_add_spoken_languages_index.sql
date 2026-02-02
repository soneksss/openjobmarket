-- ============================================================================
-- Migration: Add GIN index on spoken_languages for faster array searches
-- Date: 2026-02-02
-- Purpose: Improve performance of language filter queries on professional_profiles
-- ============================================================================

-- Create GIN index for array contains queries on spoken_languages
CREATE INDEX IF NOT EXISTS idx_professional_profiles_spoken_languages
  ON professional_profiles USING GIN (spoken_languages);

-- Log the index creation
DO $$
DECLARE
  v_index_exists BOOLEAN;
  v_total_profiles INTEGER;
  v_profiles_with_languages INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'professional_profiles'
      AND indexname = 'idx_professional_profiles_spoken_languages'
  ) INTO v_index_exists;

  SELECT COUNT(*) INTO v_total_profiles FROM professional_profiles;

  SELECT COUNT(*) INTO v_profiles_with_languages
  FROM professional_profiles
  WHERE spoken_languages IS NOT NULL AND array_length(spoken_languages, 1) > 0;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Spoken Languages Index Migration';
  RAISE NOTICE '  - GIN Index exists: %', CASE WHEN v_index_exists THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE '  - Total profiles: %', v_total_profiles;
  RAISE NOTICE '  - Profiles with languages: %', v_profiles_with_languages;
  RAISE NOTICE '========================================';
END $$;
