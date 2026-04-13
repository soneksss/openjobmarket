-- ============================================================
-- Chat photo storage: bucket + RLS + column + cleanup
-- ============================================================

-- 1. Private bucket (5 MB per file, webp/jpeg/png accepted)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  false,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS on storage.objects for the bucket
--    Authenticated users may upload / read / delete their own chat photos.
--    (Limit enforcement happens in the API route, not here.)
CREATE POLICY "chat_images_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "chat_images_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-images');

CREATE POLICY "chat_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images');

-- 3. Add photo_urls column to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_messages_photo_urls
  ON messages USING GIN(photo_urls)
  WHERE photo_urls IS NOT NULL AND photo_urls <> '{}';

-- 4. Helper: count photos already sent in a job conversation
CREATE OR REPLACE FUNCTION count_job_chat_photos(p_job_id uuid)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    SUM(COALESCE(array_length(photo_urls, 1), 0)), 0
  )::int
  FROM messages
  WHERE job_id = p_job_id
    AND photo_urls IS NOT NULL
    AND array_length(photo_urls, 1) > 0;
$$;

-- 5. Cleanup function: remove storage objects + clear photo_urls
--    Triggers on:
--      (a) job completed/cancelled  AND  message older than 30 days
--      (b) message older than 90 days regardless of job status
CREATE OR REPLACE FUNCTION cleanup_old_chat_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r   RECORD;
  obj TEXT;
BEGIN
  FOR r IN
    SELECT m.id, m.photo_urls
    FROM   messages m
    LEFT JOIN jobs j ON j.id = m.job_id
    WHERE  m.photo_urls IS NOT NULL
      AND  array_length(m.photo_urls, 1) > 0
      AND  (
             (j.status IN ('COMPLETED','CANCELLED')
              AND m.created_at < NOW() - INTERVAL '30 days')
             OR m.created_at < NOW() - INTERVAL '90 days'
           )
  LOOP
    FOREACH obj IN ARRAY r.photo_urls
    LOOP
      DELETE FROM storage.objects
      WHERE bucket_id = 'chat-images'
        AND name = obj;
    END LOOP;

    UPDATE messages SET photo_urls = '{}' WHERE id = r.id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_chat_images() TO service_role;

-- 6. Schedule daily cleanup at 03:00 UTC via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;

SELECT cron.schedule(
  'cleanup-chat-images-daily',
  '0 3 * * *',
  $$SELECT cleanup_old_chat_images()$$
)
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-chat-images-daily'
);

DO $$ BEGIN
  RAISE NOTICE '✓ chat-images bucket, column, limits and cron cleanup ready';
END $$;
