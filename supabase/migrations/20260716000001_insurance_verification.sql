-- ============================================================
-- Feature: Insurance Verification for Tradespeople
-- ============================================================
-- Also fixes a real bug: the existing insurance upload wrote to the
-- PUBLIC "company-logos" bucket at path `insurance/${profile.id}/...`,
-- but that bucket's INSERT policy requires the first path segment to
-- equal auth.uid() — so every insurance upload was silently rejected
-- by RLS (regardless of file type), which is why it got stuck on
-- "Uploading…" forever. That bucket's allowed_mime_types is also
-- image-only, so PDFs would have failed anyway.
--
-- Fix: a dedicated PRIVATE bucket with an owner-scoped path
-- ({auth.uid()}/...), matching the working company-logos pattern.
-- No SELECT policy is added — the bucket is fully closed to direct
-- client reads. Viewing goes through a server API route that checks
-- owner-or-admin, then mints a short-lived signed URL with the
-- service-role client. This satisfies "must NOT be publicly
-- accessible" and "only owner/admin can view" from the spec.
-- ============================================================

-- ── 1. Schema: structured insurance fields on company_profiles ──────────────
--
-- active_urgent_tradespeople (20260517000002_urgent_notification_consistency.sql)
-- is `SELECT * FROM company_profiles ...`, so it depends on every column and
-- blocks DROP COLUMN. Drop it first, alter the table, then recreate it
-- identically — SELECT * means it automatically picks up the new column set.

DROP VIEW IF EXISTS public.active_urgent_tradespeople;

ALTER TABLE public.company_profiles
  DROP COLUMN IF EXISTS insurance_document_url,
  ADD COLUMN IF NOT EXISTS insurance_document_path TEXT,
  ADD COLUMN IF NOT EXISTS insurance_provider       TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_type    TEXT,
  ADD COLUMN IF NOT EXISTS insurance_cover_amount   TEXT;

CREATE VIEW public.active_urgent_tradespeople AS
SELECT *
FROM public.company_profiles
WHERE urgent_notifications_enabled = TRUE
  AND urgent_notifications_expires_at IS NOT NULL
  AND urgent_notifications_expires_at > now();

-- ── 2. Private storage bucket ────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'insurance-documents',
  'insurance-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit     = 5242880,
  allowed_mime_types  = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- ── 3. RLS: owner-only write, no read policy (server route handles reads) ──

DROP POLICY IF EXISTS "insurance_documents_owner_insert" ON storage.objects;
CREATE POLICY "insurance_documents_owner_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'insurance-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "insurance_documents_owner_update" ON storage.objects;
CREATE POLICY "insurance_documents_owner_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'insurance-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "insurance_documents_owner_delete" ON storage.objects;
CREATE POLICY "insurance_documents_owner_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'insurance-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ── 4. search_traders(): replace dropped insurance_document_url output ─────
-- with a computed insurance_verified boolean. Nothing in the frontend reads
-- this RPC's insurance columns today (confirmed before writing this
-- migration), and the document path must never be exposed via a broad
-- search RPC anyway, so this is a straight column swap, not a behaviour
-- regression for any caller.

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
  insurance_verified          boolean,
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
    price_list, insurance_verified, insurance_expiry_date, created_at,
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
      (cp.insurance_document_path IS NOT NULL
        AND cp.insurance_expiry_date IS NOT NULL
        AND cp.insurance_expiry_date >= CURRENT_DATE)   AS insurance_verified,
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
      false::boolean                                    AS insurance_verified,
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

DO $$ BEGIN RAISE NOTICE '✅ Migration 20260716000001 (insurance verification) complete'; END; $$;
