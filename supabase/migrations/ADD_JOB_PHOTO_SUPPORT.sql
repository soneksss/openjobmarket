-- Add job photo support for tasks/jobs
-- This allows homeowners and others to attach photos to task postings

-- Add job_photo_url column to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS job_photo_url TEXT;

-- Add comment
COMMENT ON COLUMN jobs.job_photo_url IS 'URL to job photo (optional, mainly for tradespeople tasks)';

-- Create storage bucket for job photos (run this in Supabase dashboard > Storage)
-- Bucket name: job-photos
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Storage policies (run these after creating the bucket):

-- 1. Allow authenticated users to upload their own job photos
CREATE POLICY "Users can upload job photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Allow public read access to job photos
CREATE POLICY "Public can view job photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'job-photos');

-- 3. Allow users to delete their own job photos
CREATE POLICY "Users can delete their own job photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'job-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: You need to manually create the 'job-photos' storage bucket in Supabase dashboard:
-- 1. Go to Storage in Supabase dashboard
-- 2. Create a new bucket named 'job-photos'
-- 3. Set it as Public
-- 4. Configure file size limit: 5242880 (5MB)
-- 5. Configure allowed MIME types: image/jpeg, image/png, image/webp, image/gif
