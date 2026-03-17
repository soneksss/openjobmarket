-- ============================================================================
-- Migration: Ensure spoken_languages in company_profiles is text[]
-- Date: 2026-03-16
-- Purpose: Allow tradespeople to save spoken languages and be filtered
--          by homeowners. Converts from jsonb → text[] if needed.
-- ============================================================================

DO $$
DECLARE
  v_col_type text;
BEGIN
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'company_profiles'
    AND column_name  = 'spoken_languages';

  IF v_col_type IS NULL THEN
    -- Column doesn't exist at all — add it as text[]
    EXECUTE 'ALTER TABLE company_profiles ADD COLUMN spoken_languages text[] DEFAULT ''{}''';
    RAISE NOTICE 'spoken_languages column added as text[]';

  ELSIF v_col_type = 'jsonb' OR v_col_type = 'json' THEN
    -- PostgreSQL forbids subqueries in ALTER COLUMN USING expressions.
    -- Workaround: add a temp text[] column, populate it, swap, drop old.
    EXECUTE 'ALTER TABLE company_profiles ADD COLUMN spoken_languages_new text[] DEFAULT ''{}''';

    -- Populate: jsonb arrays → text[], everything else → '{}'
    EXECUTE $sql$
      UPDATE company_profiles
      SET spoken_languages_new = CASE
        WHEN spoken_languages IS NULL THEN '{}'::text[]
        WHEN jsonb_typeof(spoken_languages::jsonb) = 'array' THEN
          (SELECT COALESCE(array_agg(elem), '{}')
           FROM jsonb_array_elements_text(spoken_languages::jsonb) AS t(elem))
        ELSE '{}'::text[]
      END
    $sql$;

    EXECUTE 'ALTER TABLE company_profiles DROP COLUMN spoken_languages';
    EXECUTE 'ALTER TABLE company_profiles RENAME COLUMN spoken_languages_new TO spoken_languages';
    RAISE NOTICE 'spoken_languages converted from % to text[]', v_col_type;

  ELSE
    RAISE NOTICE 'spoken_languages already exists as %, no change needed', v_col_type;
  END IF;
END $$;

-- Set default and backfill NULLs
ALTER TABLE company_profiles
  ALTER COLUMN spoken_languages SET DEFAULT '{}';

UPDATE company_profiles
SET spoken_languages = '{}'
WHERE spoken_languages IS NULL;

-- GIN index for fast array-contains queries
DROP INDEX IF EXISTS idx_company_profiles_spoken_languages;
CREATE INDEX idx_company_profiles_spoken_languages
  ON company_profiles USING GIN (spoken_languages);

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'company_profiles.spoken_languages is now text[]';
  RAISE NOTICE 'GIN index created for fast language filtering';
  RAISE NOTICE '========================================';
END $$;
