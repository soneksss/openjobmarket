-- ============================================================
-- Migration: Create job-photos storage bucket with RLS policies
-- ============================================================
-- Problem: job-photos bucket was never created, so uploads hang
-- or silently fail when homeowners/tradespeople attach photos.
--
-- Fix: Create the bucket (public for reads) and add RLS policies
-- so authenticated users can upload to their own folder only.
-- ============================================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos',
  'job-photos',
  true,           -- public bucket — photos are viewable without auth
  5242880,        -- 5 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Drop any stale policies ──────────────────────────────────
DROP POLICY IF EXISTS "job_photos_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "job_photos_auth_insert"   ON storage.objects;
DROP POLICY IF EXISTS "job_photos_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "job_photos_owner_delete"  ON storage.objects;

-- ── SELECT: anyone can view job photos (bucket is public) ────
CREATE POLICY "job_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-photos');

-- ── INSERT: authenticated users upload under their own user_id folder ──
-- File path must be: {auth.uid()}/filename.jpg
CREATE POLICY "job_photos_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── UPDATE: owner can replace their own files ────────────────
CREATE POLICY "job_photos_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── DELETE: owner can delete their own files ─────────────────
CREATE POLICY "job_photos_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DO $$ BEGIN
  RAISE NOTICE '✓ job-photos bucket created/updated with RLS policies';
END $$;
