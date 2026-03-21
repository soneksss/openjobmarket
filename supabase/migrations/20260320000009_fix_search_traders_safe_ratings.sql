-- ============================================================
-- Fix: search_traders — safe company ratings
-- Migration 008 may have broken trader visibility if
-- company_profiles.average_rating was not accessible.
-- This version uses COALESCE so NULL values never cause errors.
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
  profile_type        text,
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
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  lat_min double precision;
  lat_max double precision;
  lon_min double precision;
  lon_max double precision;
  has_avg_rating boolean;
  has_reviews_count boolean;
BEGIN
  -- Bounding box
  lat_min := p_lat - (p_radius_miles * 1.60934 / 111.0);
  lat_max := p_lat + (p_radius_miles * 1.60934 / 111.0);
  lon_min := p_lon - (p_radius_miles * 1.60934 / (111.0 * cos(radians(p_lat))));
  lon_max := p_lon + (p_radius_miles * 1.60934 / (111.0 * cos(radians(p_lat))));

  -- Check if rating columns exist on company_profiles
  SELECT
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='average_rating'),
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='reviews_count')
  INTO has_avg_rating, has_reviews_count;

  -- ── Companies ──────────────────────────────────────────────────
  IF has_avg_rating AND has_reviews_count THEN
    RETURN QUERY
    SELECT
      cp.id,
      'company'::text,
      cp.company_name,
      cp.industry,
      cp.location,
      cp.latitude,
      cp.longitude,
      cp.logo_url,
      cp.description,
      cp.services,
      cp.spoken_languages,
      cp.open_for_business,
      COALESCE(cp.average_rating, 0)::double precision,
      COALESCE(cp.reviews_count, 0)::int,
      cp.user_id,
      false::boolean
    FROM company_profiles cp
    WHERE cp.latitude  IS NOT NULL
      AND cp.longitude IS NOT NULL
      AND cp.latitude  BETWEEN lat_min AND lat_max
      AND cp.longitude BETWEEN lon_min AND lon_max
      AND (
        p_search IS NULL OR p_search = '' OR
        cp.company_name ILIKE '%' || p_search || '%' OR
        cp.industry     ILIKE '%' || p_search || '%' OR
        cp.description  ILIKE '%' || p_search || '%' OR
        EXISTS (SELECT 1 FROM unnest(cp.services) AS svc WHERE svc ILIKE '%' || p_search || '%')
      )
      AND (p_language IS NULL OR p_language = '' OR cp.spoken_languages @> ARRAY[p_language]);
  ELSE
    -- Fallback: columns don't exist yet — return NULL for ratings
    RETURN QUERY
    SELECT
      cp.id,
      'company'::text,
      cp.company_name,
      cp.industry,
      cp.location,
      cp.latitude,
      cp.longitude,
      cp.logo_url,
      cp.description,
      cp.services,
      cp.spoken_languages,
      cp.open_for_business,
      NULL::double precision,
      NULL::int,
      cp.user_id,
      false::boolean
    FROM company_profiles cp
    WHERE cp.latitude  IS NOT NULL
      AND cp.longitude IS NOT NULL
      AND cp.latitude  BETWEEN lat_min AND lat_max
      AND cp.longitude BETWEEN lon_min AND lon_max
      AND (
        p_search IS NULL OR p_search = '' OR
        cp.company_name ILIKE '%' || p_search || '%' OR
        cp.industry     ILIKE '%' || p_search || '%' OR
        cp.description  ILIKE '%' || p_search || '%' OR
        EXISTS (SELECT 1 FROM unnest(cp.services) AS svc WHERE svc ILIKE '%' || p_search || '%')
      )
      AND (p_language IS NULL OR p_language = '' OR cp.spoken_languages @> ARRAY[p_language]);
  END IF;

  -- ── Self-employed professionals ─────────────────────────────────
  RETURN QUERY
  SELECT
    pp.id,
    'professional'::text,
    COALESCE(NULLIF(TRIM(pp.first_name || ' ' || pp.last_name), ''), 'Anonymous'),
    pp.industry,
    pp.location,
    pp.latitude,
    pp.longitude,
    pp.profile_photo_url,
    pp.bio,
    NULL::text[],
    pp.spoken_languages,
    pp.available_for_work,
    COALESCE(pp.average_rating, 0)::double precision,
    COALESCE(pp.reviews_count, 0)::int,
    pp.user_id,
    true::boolean
  FROM professional_profiles pp
  WHERE pp.latitude    IS NOT NULL
    AND pp.longitude   IS NOT NULL
    AND pp.profile_visible = true
    AND pp.available_for_work = true
    AND pp.is_self_employed = true
    AND pp.latitude  BETWEEN lat_min AND lat_max
    AND pp.longitude BETWEEN lon_min AND lon_max
    AND (
      p_search IS NULL OR p_search = '' OR
      pp.first_name ILIKE '%' || p_search || '%' OR
      pp.last_name  ILIKE '%' || p_search || '%' OR
      pp.title      ILIKE '%' || p_search || '%' OR
      pp.bio        ILIKE '%' || p_search || '%'
    )
    AND (p_language IS NULL OR p_language = '' OR pp.spoken_languages @> ARRAY[p_language]);

END;
$$;

GRANT EXECUTE ON FUNCTION public.search_traders TO authenticated, anon;

DO $$ BEGIN
  RAISE NOTICE '✓ search_traders — safe plpgsql version with runtime column check';
END $$;
