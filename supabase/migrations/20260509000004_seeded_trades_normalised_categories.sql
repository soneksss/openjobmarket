-- ============================================================
-- Add normalised_categories[] to seeded_trades.
-- Each row stores ALL industry keys (from both the primary
-- trade_category AND all categories/1..10 columns in the CSV),
-- normalised using the same SEEDED_CATEGORY_MAP as the front-end.
-- A GIN index makes @> (contains) queries fast.
-- ============================================================

ALTER TABLE public.seeded_trades
  ADD COLUMN IF NOT EXISTS normalised_categories text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_seeded_trades_normalised_cats
  ON public.seeded_trades USING GIN (normalised_categories);

-- ── Populate: multi-category companies first ──────────────────

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Carpentry & Joinery','Handyman / Small Jobs']
  WHERE company_name = 'kp builders Portsmouth';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Carpentry & Joinery']
  WHERE company_name = 'D M Habens The Builder Ltd';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Fencing & Gates','Gardening & Landscaping','Flooring & Tiling']
  WHERE company_name = 'M2 BUILDERS';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Handyman / Small Jobs','Plumbing & Heating']
  WHERE company_name = 'Building Heroes Handyman Services Portsmouth';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Carpentry & Joinery','Construction & Renovation','Electrical','Painting & Decorating','Plastering & Rendering','Plumbing & Heating']
  WHERE company_name = 'IN4structure Limited';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Carpentry & Joinery','Construction & Renovation']
  WHERE company_name = 'Sapphire Carpentry and Building Ltd';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Painting & Decorating','Construction & Renovation']
  WHERE company_name = 'The Southsea Decorating Company';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Handyman / Small Jobs','Painting & Decorating']
  WHERE company_name = 'A* Home Improvements';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Carpentry & Joinery','Cleaning','Gardening & Landscaping','Painting & Decorating','Plumbing & Heating']
  WHERE company_name = 'Get The Builders In';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Fencing & Gates','Carpentry & Joinery']
  WHERE company_name = 'Acadia Timber Ltd';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Fencing & Gates','Gardening & Landscaping']
  WHERE company_name = 'Apex Fence & Construction';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Fencing & Gates','Gardening & Landscaping']
  WHERE company_name = 'L T Fencing';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Electrical','Carpentry & Joinery','Handyman / Small Jobs']
  WHERE company_name = 'Current Solutions Electrical & Property Services';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Waste Removal','Construction & Renovation','Gardening & Landscaping']
  WHERE company_name = 'Portsmouth Rubbish And Waste';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Electrical']
  WHERE company_name IN (
    'Mayo Electrical Contractors Ltd.',
    'Portsmouth Electricians 4U Ltd',
    'Coastal Electrical Installations Ltd'
  );

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Plastering & Rendering']
  WHERE company_name = 'D.G. Gyles Plastering';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Painting & Decorating']
  WHERE company_name = 'Stark & Son Painting and Decorating';

-- ── Populate: single-category companies (primary category only) ──

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Construction company','Home builder','Building firm','Custom home builder','Boat builders','Real estate developer','Building consultant','Building restoration service','Bricklayer','General contractor','Contractor');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Electrical']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Electrician','Electrical installation service','Lighting contractor','Solar energy company','Utility contractor');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Plumbing & Heating']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Plumber','Gas engineer','Drainage service');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Carpentry & Joinery']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Carpenter','Joiner','Kitchen remodeler','Bathroom remodeler','Garage builder','Deck builder','Shed builder');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Painting & Decorating']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Painter','Painting','Interior Decorator');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Plastering & Rendering']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Plasterer','Ceiling supplier');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Roofing']
  WHERE normalised_categories = '{}'
    AND trade_category = 'Roofing contractor';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Gardening & Landscaping']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Landscaper','Gardener','Landscape designer','Garden');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Flooring & Tiling']
  WHERE normalised_categories = '{}'
    AND trade_category = 'Paving contractor';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Cleaning']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Cleaning service','House cleaning service','Cleaners','Dry cleaner','Laundry','Carpet cleaning service');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Handyman / Small Jobs']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Handyman/Handywoman/Handyperson','Property maintenance');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Waste Removal']
  WHERE normalised_categories = '{}'
    AND trade_category IN ('Waste management service','Garbage collection service','House clearance service','Junk removal service','Moving and storage service','Mover','Garbage dump');

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Fencing & Gates']
  WHERE normalised_categories = '{}'
    AND trade_category = 'Fence contractor';

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Air Conditioning & Ventilation']
  WHERE normalised_categories = '{}'
    AND trade_category = 'Air conditioning service';

-- Catch-all for any remaining unmapped rows
UPDATE public.seeded_trades SET normalised_categories = ARRAY['Not sure / Other']
  WHERE normalised_categories = '{}';

-- ── Update search_traders to also match normalised_categories ─────────────

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
        st.company_name         ILIKE '%' || p_search || '%' OR
        st.trade_category       ILIKE '%' || p_search || '%' OR
        st.normalised_categories @> ARRAY[p_search]
      )
  ) combined
  ORDER BY _priority, rating DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_traders TO authenticated, anon;

DO $$ BEGIN
  RAISE NOTICE '✓ normalised_categories populated and search_traders updated';
END $$;
