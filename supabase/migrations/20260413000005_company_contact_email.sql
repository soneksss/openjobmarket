-- Add contact_email to company_profiles and surface it via search_traders

-- 1. Add column
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 2. Backfill from auth.users (SECURITY DEFINER context)
UPDATE company_profiles cp
SET contact_email = au.email
FROM auth.users au
WHERE au.id = cp.user_id
  AND cp.contact_email IS NULL;

-- 3. Rebuild search_traders with contact_email
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
  industries                  text[],
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
  company_size                text,
  business_type               text,
  service_24_7                boolean,
  phone_number                text,
  contact_email               text,
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
    COALESCE(cp.industries[1], cp.industry)          AS industry,
    COALESCE(cp.industries, CASE WHEN cp.industry IS NOT NULL AND cp.industry <> '' THEN ARRAY[cp.industry] ELSE '{}' END) AS industries,
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
    cp.contact_email,
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
      EXISTS (SELECT 1 FROM unnest(COALESCE(cp.industries, '{}')) AS ind WHERE ind ILIKE '%' || p_search || '%') OR
      cp.description  ILIKE '%' || p_search || '%' OR
      EXISTS (SELECT 1 FROM unnest(COALESCE(cp.services, '{}')) AS svc WHERE svc ILIKE '%' || p_search || '%')
    )
    AND (p_language IS NULL OR p_language = '' OR cp.spoken_languages @> ARRAY[p_language])
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_traders TO authenticated, anon;

DO $$ BEGIN
  RAISE NOTICE '✓ contact_email added to company_profiles and search_traders';
END $$;
