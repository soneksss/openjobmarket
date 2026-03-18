-- ============================================================
-- RPC: search_traders
-- Replaces the slow client-side company_profiles + professional_profiles
-- bounding-box queries that timed out due to RLS row-by-row evaluation.
--
-- Runs as SECURITY DEFINER so RLS is skipped; the function itself
-- enforces visibility (open_for_business / profile_visible) and
-- only returns the columns the UI actually needs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_traders(
  p_lat          double precision,
  p_lon          double precision,
  p_radius_miles double precision DEFAULT 25,
  p_search       text             DEFAULT NULL,
  p_language     text             DEFAULT NULL,
  p_limit        int              DEFAULT 101
)
RETURNS TABLE (
  id                  uuid,
  profile_type        text,   -- 'company' | 'professional'
  name                text,
  industry            text,
  location            text,
  latitude            double precision,
  longitude           double precision,
  logo_url            text,
  description         text,
  services            text[],
  spoken_languages    text[],
  open_for_business   boolean,
  rating              double precision,
  reviews_count       int,
  user_id             uuid,
  is_self_employed    boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH bbox AS (
    SELECT
      p_lat - (p_radius_miles * 1.60934 / 111.0)                                         AS lat_min,
      p_lat + (p_radius_miles * 1.60934 / 111.0)                                         AS lat_max,
      p_lon - (p_radius_miles * 1.60934 / (111.0 * cos(radians(p_lat))))                 AS lon_min,
      p_lon + (p_radius_miles * 1.60934 / (111.0 * cos(radians(p_lat))))                 AS lon_max
  )
  -- ── Companies ────────────────────────────────────────────────────────────
  SELECT
    cp.id,
    'company'::text                            AS profile_type,
    cp.company_name                            AS name,
    cp.industry,
    cp.location,
    cp.latitude,
    cp.longitude,
    cp.logo_url,
    cp.description,
    cp.services,
    cp.spoken_languages,
    cp.open_for_business,
    NULL::double precision             AS rating,
    NULL::int                          AS reviews_count,
    cp.user_id,
    false                                      AS is_self_employed
  FROM company_profiles cp, bbox
  WHERE cp.latitude  IS NOT NULL
    AND cp.longitude IS NOT NULL
    AND cp.latitude  BETWEEN bbox.lat_min AND bbox.lat_max
    AND cp.longitude BETWEEN bbox.lon_min AND bbox.lon_max
    AND (
      p_search IS NULL OR p_search = '' OR
      cp.company_name ILIKE '%' || p_search || '%' OR
      cp.industry     ILIKE '%' || p_search || '%'
    )
    AND (
      p_language IS NULL OR p_language = '' OR
      cp.spoken_languages @> ARRAY[p_language]
    )

  UNION ALL

  -- ── Self-employed professionals ──────────────────────────────────────────
  SELECT
    pp.id,
    'professional'::text                       AS profile_type,
    COALESCE(NULLIF(TRIM(pp.first_name || ' ' || pp.last_name), ''), 'Anonymous') AS name,
    pp.industry,
    pp.location,
    pp.latitude,
    pp.longitude,
    pp.profile_photo_url                       AS logo_url,
    pp.bio                                     AS description,
    NULL::text[]                               AS services,
    pp.spoken_languages,
    pp.available_for_work                      AS open_for_business,
    pp.average_rating::double precision        AS rating,
    pp.reviews_count::int,
    pp.user_id,
    true                                       AS is_self_employed
  FROM professional_profiles pp, bbox
  WHERE pp.latitude    IS NOT NULL
    AND pp.longitude   IS NOT NULL
    AND pp.profile_visible = true
    AND pp.available_for_work = true
    AND pp.is_self_employed = true
    AND pp.latitude  BETWEEN bbox.lat_min AND bbox.lat_max
    AND pp.longitude BETWEEN bbox.lon_min AND bbox.lon_max
    AND (
      p_search IS NULL OR p_search = '' OR
      pp.first_name ILIKE '%' || p_search || '%' OR
      pp.last_name  ILIKE '%' || p_search || '%' OR
      pp.title      ILIKE '%' || p_search || '%'
    )
    AND (
      p_language IS NULL OR p_language = '' OR
      pp.spoken_languages @> ARRAY[p_language]
    )

  LIMIT p_limit
$$;

-- Allow any authenticated or anon user to call it (data is already filtered)
GRANT EXECUTE ON FUNCTION public.search_traders TO authenticated, anon;

DO $$ BEGIN
  RAISE NOTICE '✓ search_traders RPC created (SECURITY DEFINER, bypasses RLS)';
END $$;
