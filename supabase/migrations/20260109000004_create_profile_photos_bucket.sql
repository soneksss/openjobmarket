-- Migration: Create Profile Photos Storage Bucket
-- Date: 2026-01-09
-- Description: Creates storage bucket for professional profile photos with RLS policies

-- Create profile-photos bucket (PUBLIC for easy access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true, -- Public bucket
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Professionals upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Professionals update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Professionals delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public profile photo access" ON storage.objects;

-- RLS Policy 1: Professionals can upload their own photos
CREATE POLICY "Professionals upload own photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy 2: Professionals can update their own photos
CREATE POLICY "Professionals update own photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy 3: Professionals can delete their own photos
CREATE POLICY "Professionals delete own photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy 4: Everyone can view profile photos (public bucket)
CREATE POLICY "Public profile photo access" ON storage.objects
FOR SELECT USING (
  bucket_id = 'profile-photos'
);
