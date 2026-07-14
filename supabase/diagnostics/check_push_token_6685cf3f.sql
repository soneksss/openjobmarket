-- Diagnostic: does this tradesperson have a push token, and what shape is it?
-- User: 6685cf3f-2346-4de2-a816-50513ed926ed (Samsung Galaxy S24 — expect device_type = 'fcm', platform = 'android')

-- 1. Push token(s) for this user
SELECT
  user_id,
  token,
  device_type,
  platform,
  role,
  created_at,
  last_seen
FROM public.user_push_tokens
WHERE user_id = '6685cf3f-2346-4de2-a816-50513ed926ed';

-- 2. Cross-check their availability state (was yesterday's toggle-on reflected correctly?)
SELECT
  user_id,
  id                                AS company_id,
  open_for_business,
  availability_expires_at,
  urgent_notifications_enabled,
  urgent_notifications_expires_at,
  last_availability_prompt_at
FROM public.company_profiles
WHERE user_id = '6685cf3f-2346-4de2-a816-50513ed926ed';

-- 3. Would today's daily-availability-prompt cron have picked them up at all?
--    (mirrors get_traders_for_availability_prompt()'s WHERE clause)
SELECT
  user_id,
  id AS company_id,
  availability_expires_at,
  availability_expires_at < now()                                            AS expired,
  last_availability_prompt_at,
  (last_availability_prompt_at IS NULL
    OR last_availability_prompt_at < now() - interval '12 hours')            AS eligible_for_prompt
FROM public.company_profiles
WHERE user_id = '6685cf3f-2346-4de2-a816-50513ed926ed';
