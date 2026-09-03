-- ============================================================================
-- Relax the job-photos INSERT policy
-- Date: 2026-09-03
--
-- Symptom: homeowners/tradespeople can post a job WITHOUT a photo, but posting
-- WITH a photo fails — the client-side compress ("resize") step succeeds (the
-- preview renders), and the failure is the `storage.objects` INSERT for the
-- `job-photos` bucket.
--
-- Cause: the old INSERT policy required
--     (storage.foldername(name))[1] = auth.uid()::text
-- i.e. the upload path's first segment had to be EXACTLY the caller's auth uid.
-- The job wizard built that path from a server-passed profile row
-- (`resolvedProfile.user_id`), which can differ from the live session's
-- `auth.uid()` (SSR prop drift, guest→signup, profile edited by staff, …).
-- Any mismatch → RLS denies the INSERT → "new row violates row-level security
-- policy" and the photo is dropped / the post hangs.
--
-- Fix: match the working `chat-images` bucket — allow any authenticated user to
-- INSERT into `job-photos` (reads are already public; UPDATE/DELETE keep the
-- per-folder ownership check). The client still writes to `{uid}/…` by
-- convention. Idempotent.
-- ============================================================================

-- Make sure the bucket exists and accepts webp (safe to re-run).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos', 'job-photos', true, 5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "job_photos_auth_insert" ON storage.objects;

CREATE POLICY "job_photos_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-photos');

DO $$ BEGIN
  RAISE NOTICE '✓ job_photos_auth_insert relaxed to any authenticated user';
END $$;
