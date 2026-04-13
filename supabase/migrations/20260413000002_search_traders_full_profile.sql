-- ============================================================
-- Extend search_traders to return all fields visible on the
-- company profile page so the map sidebar modal shows the
-- same complete info as /company/[user_id].
-- ============================================================

DROP FUNCTION IF EXISTS public.search_traders(double precision, double precision, double precision, text, text, integer);

CREATE OR REPLACE FUNCTION public.search_traders(
  p_lat          double precision,
  p_lon          double precision,
  p_radius_miles double precision DEFAULT 25,
  p_search       text             DEFAULT NULL,
  p_language     text             DEFAULT NULL,
  p_limit        int              DEFAULT 101
)
RETURNS TABLE (
  id                          uuid,
  profile_type                text,
  name                        text,
  industry                    text,
  location                    text,
  latitude                    double precision,
  longitude                   double precision,
  logo_url                    text,
  description                 text,
  services                    text[],
  spoken_languages             text[],
  open_for_business           boolean,
  rating                      double precision,
  reviews_count               int,
  user_id                     uuid,
  is_self_employed            boolean,
  -- additional fields for full profile view
  company_size                text,
  business_type               text,
  service_24_7                boolean,
  phone_number                text,
  website_url                 text,
  price_list                  text,
  insurance_document_url      text,
  insurance_expiry_date       date,
  created_at                  timestamptz,
  hide_contact_info           boolean,
  hide_company_info           boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    cp.id,
    'company'::text                                  AS profile_type,
    cp.company_name                                  AS name,
    cp.industry,
    cp.location,
    cp.latitude::double precision                    AS latitude,
    cp.longitude::double precision                   AS longitude,
    cp.logo_url,
    cp.description,
    cp.services,
    cp.spoken_languages,
    cp.open_for_business,
    COALESCE(cp.average_rating, 0)::double precision AS rating,
    COALESCE(cp.reviews_count,  0)::int              AS reviews_count,
    cp.user_id,
    false::boolean                                   AS is_self_employed,
    cp.company_size,
    cp.business_type::text,
    COALESCE(cp.service_24_7, false)                 AS service_24_7,
    cp.phone_number,
    cp.website_url,
    cp.price_list,
    cp.insurance_document_url,
    cp.insurance_expiry_date,
    cp.created_at,
    COALESCE(cp.hide_contact_info, false)            AS hide_contact_info,
    COALESCE(cp.hide_company_info, false)            AS hide_company_info
  FROM company_profiles cp
  WHERE cp.latitude  IS NOT NULL
    AND cp.longitude IS NOT NULL
    AND cp.latitude::double precision
          BETWEEN (p_lat - (p_radius_miles * 1.60934 / 111.0))
              AND (p_lat + (p_radius_miles * 1.60934 / 111.0))
    AND cp.longitude::double precision
          BETWEEN (p_lon - (p_radius_miles * 1.60934 / (111.0 * cos(radians(p_lat)))))
              AND (p_lon + (p_radius_miles * 1.60934 / (111.0 * cos(radians(p_lat)))))
    AND (
      p_search IS NULL OR p_search = '' OR
      cp.company_name ILIKE '%' || p_search || '%' OR
      cp.industry     ILIKE '%' || p_search || '%' OR
      cp.description  ILIKE '%' || p_search || '%' OR
      EXISTS (
        SELECT 1 FROM unnest(cp.services) AS svc
        WHERE svc ILIKE '%' || p_search || '%'
      )
    )
    AND (p_language IS NULL OR p_language = '' OR cp.spoken_languages @> ARRAY[p_language])
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_traders TO authenticated, anon;

DO $$ BEGIN
  RAISE NOTICE '✓ search_traders — extended with full company profile fields';
END $$;
