-- Check RLS Policies on Notifications Table
-- Run this in Supabase SQL Editor to see current policies

-- 1. Check if RLS is enabled on notifications table
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'notifications';

-- 2. List all RLS policies on notifications table
SELECT
  policyname as policy_name,
  cmd as operation,
  permissive,
  ARRAY_TO_STRING(roles, ', ') as roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- 3. Check notifications table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 4. Test INSERT permission (this will fail if no policy allows it)
-- Uncomment to test:
/*
INSERT INTO notifications (user_id, type, title, message)
VALUES (auth.uid(), 'test', 'Test Notification', 'Testing RLS');

-- If successful, clean up:
DELETE FROM notifications WHERE type = 'test' AND title = 'Test Notification';
*/
