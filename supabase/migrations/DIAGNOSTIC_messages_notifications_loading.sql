-- ============================================================
-- DIAGNOSTIC: Messages & Notifications stuck on loading
-- for info@openjobmarket.com
-- Run each section in Supabase SQL Editor
-- ============================================================

-- ── SECTION 1: Find the user and check their public.users record ────────────

SELECT
  au.id                AS auth_uid,
  au.email,
  au.created_at        AS auth_created,
  au.email_confirmed_at,
  pu.id                AS public_users_id,
  pu.user_type,
  pu.full_name,
  pu.nickname,
  CASE
    WHEN pu.id IS NULL THEN '❌ MISSING — no row in public.users'
    WHEN pu.user_type IS NULL THEN '⚠️  user_type is NULL — messages page wont know which profile to load'
    ELSE '✅ OK'
  END AS diagnosis
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email = 'info@openjobmarket.com';


-- ── SECTION 2: Check all profile tables for this user ──────────────────────

WITH uid AS (
  SELECT id FROM auth.users WHERE email = 'info@openjobmarket.com' LIMIT 1
)
SELECT 'professional_profiles' AS tbl, COUNT(*) AS rows FROM professional_profiles WHERE user_id = (SELECT id FROM uid)
UNION ALL
SELECT 'company_profiles',     COUNT(*) FROM company_profiles     WHERE user_id = (SELECT id FROM uid)
UNION ALL
SELECT 'homeowner_profiles',   COUNT(*) FROM homeowner_profiles   WHERE user_id = (SELECT id FROM uid)
UNION ALL
SELECT 'contractor_profiles',  COUNT(*) FROM contractor_profiles  WHERE user_id = (SELECT id FROM uid);


-- ── SECTION 3: Check messages table — how many rows involve this user ───────

WITH uid AS (
  SELECT id FROM auth.users WHERE email = 'info@openjobmarket.com' LIMIT 1
)
SELECT
  COUNT(*)                                                        AS total_messages,
  COUNT(*) FILTER (WHERE sender_id    = (SELECT id FROM uid))    AS sent,
  COUNT(*) FILTER (WHERE recipient_id = (SELECT id FROM uid))    AS received,
  COUNT(*) FILTER (WHERE is_read = false AND recipient_id = (SELECT id FROM uid)) AS unread
FROM messages;


-- ── SECTION 4: Check notifications — rows and RLS ──────────────────────────

WITH uid AS (
  SELECT id FROM auth.users WHERE email = 'info@openjobmarket.com' LIMIT 1
)
SELECT
  COUNT(*)                                             AS total_notifications,
  COUNT(*) FILTER (WHERE is_read = false)              AS unread,
  MIN(created_at)                                      AS oldest,
  MAX(created_at)                                      AS newest
FROM notifications
WHERE user_id = (SELECT id FROM uid);


-- ── SECTION 5: RLS policies on messages and notifications ──────────────────

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('messages', 'notifications', 'conversations')
ORDER BY tablename, cmd;


-- ── SECTION 6: Check indexes on messages table ─────────────────────────────
-- Missing indexes on sender_id/recipient_id = full table scan = hang

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'messages'
ORDER BY indexname;


-- ── SECTION 7: Check indexes on notifications table ────────────────────────

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'notifications'
ORDER BY indexname;


-- ── SECTION 8: Check conversations table exists and has indexes ─────────────

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'conversations'
ORDER BY indexname;


-- ── SECTION 9: Simulate the exact messages query the page runs ──────────────
-- NOTE: EXPLAIN must be the outermost statement — cannot nest inside WITH.
-- Also removed FORMAT TEXT (not supported in Supabase SQL Editor).

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, subject, content, created_at, is_read, sender_id, recipient_id, conversation_id, job_id
FROM messages
WHERE sender_id    = (SELECT id FROM auth.users WHERE email = 'info@openjobmarket.com' LIMIT 1)
   OR recipient_id = (SELECT id FROM auth.users WHERE email = 'info@openjobmarket.com' LIMIT 1)
ORDER BY created_at DESC
LIMIT 300;


-- ── SECTION 10: Simulate the notifications query ────────────────────────────

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM notifications
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'info@openjobmarket.com' LIMIT 1)
ORDER BY created_at DESC
LIMIT 50;


-- ── SECTION 11: Total table sizes — spot if messages is huge ────────────────

SELECT
  relname                              AS table_name,
  pg_size_pretty(pg_total_relation_size(oid)) AS total_size,
  pg_size_pretty(pg_relation_size(oid))       AS table_size,
  reltuples::bigint                    AS estimated_rows
FROM pg_class
WHERE relname IN ('messages', 'notifications', 'conversations', 'users')
  AND relkind = 'r'
ORDER BY pg_total_relation_size(oid) DESC;


-- ── SECTION 12: Check RLS is enabled on each table ─────────────────────────

SELECT
  relname  AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN ('messages', 'notifications', 'conversations')
  AND relkind = 'r';


-- ── WHAT TO LOOK FOR ────────────────────────────────────────────────────────
--
-- Section 1: Is user in public.users? Is user_type set?
--   • Missing public.users row → messages page fetchs user_type = null →
--     loads fine but dashboard redirect goes to "/" (may cause loop)
--   • user_type = NULL → no profile queries run, conversations show but
--     back button goes to "/" which may redirect to login → looks stuck
--
-- Section 3-4: 0 messages AND 0 notifications?
--   • Page loads but stays empty — not a bug, just no data
--   • 10,000+ messages → query is slow → page hangs
--
-- Section 5 (RLS policies):
--   • If qual (WHERE clause in policy) does a sub-select on another big table
--     it evaluates PER ROW → full scan → hang
--   • Check if there's a policy that joins users or profiles table
--
-- Section 6-7 (Indexes):
--   ❌ No index on messages(sender_id) or messages(recipient_id)?
--      → OR query does seq scan on entire table → timeout
--   ❌ No index on notifications(user_id)?
--      → full scan → slow
--
-- Section 9 (EXPLAIN ANALYZE):
--   • Seq Scan on messages = missing index = CAUSE OF HANG
--   • Index Scan = index exists, look at actual time
--   • "actual time=X..Y" where Y > 5000 ms = slow query
