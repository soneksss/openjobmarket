-- Count photos sent by a user in the last 24 hours (daily rate-limit helper)
CREATE OR REPLACE FUNCTION count_user_daily_chat_photos(p_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    SUM(COALESCE(array_length(photo_urls, 1), 0)), 0
  )::int
  FROM messages
  WHERE sender_id   = p_user_id
    AND created_at  > NOW() - INTERVAL '24 hours'
    AND photo_urls IS NOT NULL
    AND array_length(photo_urls, 1) > 0;
$$;

GRANT EXECUTE ON FUNCTION count_user_daily_chat_photos(uuid) TO authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE '✓ count_user_daily_chat_photos ready';
END $$;
