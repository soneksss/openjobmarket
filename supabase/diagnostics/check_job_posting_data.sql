-- ============================================================================
-- DIAGNOSTIC: Job data completeness + language filter readiness
-- Run each block separately in Supabase SQL Editor.
-- ============================================================================


-- ══════════════════════════════════════════════════════════════════════════════
-- QUERY 1: Latest 5 trade jobs — all key filterable fields
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  id,
  created_at,
  title,
  category,
  urgency_type,
  is_urgent,
  is_tradespeople_job,
  location,
  latitude,
  longitude,
  budget_min,
  budget_max,
  languages,
  preferred_language,
  status,
  is_active
FROM jobs
WHERE is_tradespeople_job = true
ORDER BY created_at DESC
LIMIT 5;


-- ══════════════════════════════════════════════════════════════════════════════
-- QUERY 2: Data coverage for each tradesperson filter
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  'category'      AS filter,
  COUNT(*) FILTER (WHERE category IS NOT NULL AND category <> '')   AS has_data,
  COUNT(*)                                                           AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE category IS NOT NULL AND category <> '') / NULLIF(COUNT(*),0), 0) AS pct
FROM jobs WHERE is_tradespeople_job = true

UNION ALL

SELECT
  'latitude/longitude',
  COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL),
  COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) / NULLIF(COUNT(*),0), 0)
FROM jobs WHERE is_tradespeople_job = true

UNION ALL

SELECT
  'languages (job requirement)',
  COUNT(*) FILTER (WHERE languages IS NOT NULL AND languages::text NOT IN ('null','[]','{}','')),
  COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE languages IS NOT NULL AND languages::text NOT IN ('null','[]','{}','')) / NULLIF(COUNT(*),0), 0)
FROM jobs WHERE is_tradespeople_job = true

UNION ALL

SELECT
  'urgency_type',
  COUNT(*) FILTER (WHERE urgency_type IS NOT NULL),
  COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE urgency_type IS NOT NULL) / NULLIF(COUNT(*),0), 0)
FROM jobs WHERE is_tradespeople_job = true

UNION ALL

SELECT
  'budget_min or budget_max',
  COUNT(*) FILTER (WHERE budget_min IS NOT NULL OR budget_max IS NOT NULL),
  COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE budget_min IS NOT NULL OR budget_max IS NOT NULL) / NULLIF(COUNT(*),0), 0)
FROM jobs WHERE is_tradespeople_job = true

ORDER BY filter;


-- ══════════════════════════════════════════════════════════════════════════════
-- QUERY 3: Category breakdown — what categories are actually saved?
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  COALESCE(category, '(null — not set)') AS category,
  COUNT(*)                                AS job_count
FROM jobs
WHERE is_tradespeople_job = true
GROUP BY category
ORDER BY job_count DESC;


-- ══════════════════════════════════════════════════════════════════════════════
-- QUERY 4: company_profiles.spoken_languages — type and coverage
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  (SELECT data_type
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'company_profiles'
     AND column_name  = 'spoken_languages')          AS column_type,

  COUNT(*)                                           AS total_profiles,

  COUNT(*) FILTER (
    WHERE spoken_languages IS NOT NULL
      AND spoken_languages::text NOT IN ('null', '[]', '{}', '')
  )                                                  AS profiles_with_languages,

  COUNT(*) FILTER (
    WHERE spoken_languages IS NULL
       OR spoken_languages::text IN ('null', '[]', '{}', '')
  )                                                  AS profiles_without_languages

FROM company_profiles;


-- ══════════════════════════════════════════════════════════════════════════════
-- QUERY 5: homeowner_profiles — do they have coordinates?
-- Jobs from homeowner-job-form.tsx inherit the profile's location text but
-- NOT the lat/lng. Jobs without coords don't appear on the map.
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  COUNT(*)                                              AS total_homeowner_profiles,
  COUNT(*) FILTER (WHERE latitude  IS NOT NULL
                     AND longitude IS NOT NULL)         AS profiles_with_coords,
  COUNT(*) FILTER (WHERE latitude  IS NULL
                      OR longitude IS NULL)             AS profiles_missing_coords
FROM homeowner_profiles;
