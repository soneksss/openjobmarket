-- ============================================================================
-- Two small, non-destructive fixes
-- Date: 2026-09-06
--
-- 1) New tradespeople should start "Not available".
--    company_profiles.open_for_business currently DEFAULTs to true, so a brand
--    new tradesperson is instantly "open" (green van / receives job alerts)
--    before they've toggled "Available now". This only changes the DEFAULT for
--    FUTURE inserts — existing rows keep whatever value they have.
--    urgent_notifications_enabled already DEFAULTs to false.
--
-- 2) Ensure the private `insurance-documents` bucket + its RLS policies exist
--    (idempotent re-assert of 20260716000001, in case that migration never
--    reached this environment — the symptom is "new row violates row-level
--    security policy" when a tradesperson uploads their certificate).
--
-- Rollback:
--   ALTER TABLE public.company_profiles ALTER COLUMN open_for_business SET DEFAULT true;
--   (bucket / policies can be left in place — they are harmless.)
-- ============================================================================

-- ── 1. New-tradesperson default ────────────────────────────────────────────
ALTER TABLE public.company_profiles
  ALTER COLUMN open_for_business SET DEFAULT false;

COMMENT ON COLUMN public.company_profiles.open_for_business IS
  'Whether the tradesperson is currently available for work. Defaults to false for new profiles — they opt in via the "Available now" toggle, which sets this and urgent_notifications_enabled together.';

-- ── 2. Insurance bucket + RLS (idempotent) ────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'insurance-documents',
  'insurance-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public              = false,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- Owner-scoped write; no SELECT policy (reads go through a server route that
-- mints a signed URL with the service-role key after an owner-or-admin check).
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

DO $$ BEGIN RAISE NOTICE '✅ 20260906000002: open_for_business default → false; insurance-documents bucket asserted'; END $$;
