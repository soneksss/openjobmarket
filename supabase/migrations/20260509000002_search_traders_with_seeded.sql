-- ============================================================
-- Update search_traders to UNION real company_profiles with
-- unclaimed seeded_trades.  Seeded rows return profile_type='seeded'
-- and include claim_token so the UI can link to /claim/[token].
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
  website_url                 text,
  price_list                  text,
  insurance_document_url      text,
  insurance_expiry_date       date,
  created_at                  timestamptz,
  hide_contact_info           boolean,
  hide_company_info           boolean,
  claim_token                 uuid
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    id, profile_type, name, industry, industries, location,
    latitude, longitude, logo_url, description, services, spoken_languages,
    open_for_business, rating, reviews_count, user_id, is_self_employed,
    company_size, business_type, service_24_7, phone_number, website_url,
    price_list, insurance_document_url, insurance_expiry_date, created_at,
    hide_contact_info, hide_company_info, claim_token
  FROM (
    -- ── Real company profiles ──────────────────────────────────
    SELECT
      cp.id,
      'company'::text                                   AS profile_type,
      cp.company_name                                   AS name,
      COALESCE(cp.industries[1], cp.industry)           AS industry,
      COALESCE(cp.industries, CASE WHEN cp.industry IS NOT NULL AND cp.industry <> '' THEN ARRAY[cp.industry] ELSE '{}' END) AS industries,
      cp.location,
      cp.latitude::double precision                     AS latitude,
      cp.longitude::double precision                    AS longitude,
      cp.logo_url,
      cp.description,
      cp.services,
      cp.spoken_languages,
      cp.open_for_business,
      COALESCE(cp.average_rating, 0)::double precision  AS rating,
      COALESCE(cp.reviews_count,  0)::int               AS reviews_count,
      cp.user_id,
      false::boolean                                    AS is_self_employed,
      cp.company_size,
      cp.business_type::text,
      COALESCE(cp.service_24_7, false)                  AS service_24_7,
      cp.phone_number,
      cp.website_url,
      cp.price_list,
      cp.insurance_document_url,
      cp.insurance_expiry_date,
      cp.created_at,
      COALESCE(cp.hide_contact_info, false)             AS hide_contact_info,
      COALESCE(cp.hide_company_info, false)             AS hide_company_info,
      NULL::uuid                                        AS claim_token,
      1                                                 AS _priority
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

    UNION ALL

    -- ── Unclaimed seeded trades ────────────────────────────────
    SELECT
      st.id,
      'seeded'::text                                    AS profile_type,
      st.company_name                                   AS name,
      st.trade_category                                 AS industry,
      CASE WHEN st.trade_category IS NOT NULL
        THEN ARRAY[st.trade_category]
        ELSE '{}'::text[]
      END                                               AS industries,
      COALESCE(st.address, st.postcode)                 AS location,
      st.lat                                            AS latitude,
      st.lng                                            AS longitude,
      NULL::text                                        AS logo_url,
      NULL::text                                        AS description,
      NULL::text[]                                      AS services,
      ARRAY['English']::text[]                          AS spoken_languages,
      true::boolean                                     AS open_for_business,
      0::double precision                               AS rating,
      0::int                                            AS reviews_count,
      NULL::uuid                                        AS user_id,
      false::boolean                                    AS is_self_employed,
      NULL::text                                        AS company_size,
      NULL::text                                        AS business_type,
      false::boolean                                    AS service_24_7,
      st.phone                                          AS phone_number,
      NULL::text                                        AS website_url,
      NULL::text                                        AS price_list,
      NULL::text                                        AS insurance_document_url,
      NULL::date                                        AS insurance_expiry_date,
      st.created_at,
      false::boolean                                    AS hide_contact_info,
      false::boolean                                    AS hide_company_info,
      st.claim_token,
      2                                                 AS _priority
    FROM public.seeded_trades st
    WHERE st.lat     IS NOT NULL
      AND st.lng     IS NOT NULL
      AND st.claimed = false
      AND st.lat BETWEEN (p_lat - (p_radius_miles * 1.60934 / 111.0))
                     AND (p_lat + (p_radius_miles * 1.60934 / 111.0))
      AND st.lng BETWEEN (p_lon - (p_radius_miles * 1.60934 / (111.0 * cos(radians(p_lat)))))
                     AND (p_lon + (p_radius_miles * 1.60934 / (111.0 * cos(radians(p_lat)))))
      AND (
        p_search IS NULL OR p_search = '' OR
        st.company_name   ILIKE '%' || p_search || '%' OR
        st.trade_category ILIKE '%' || p_search || '%'
      )
  ) combined
  ORDER BY _priority, rating DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_traders TO authenticated, anon;

DO $$ BEGIN
  RAISE NOTICE '✓ search_traders updated — now UNIONs unclaimed seeded_trades with claim_token column';
END $$;
