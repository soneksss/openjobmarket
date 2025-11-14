-- OPTIMIZE MESSAGES PERFORMANCE
-- This migration adds composite indexes to improve message fetching performance
-- Run this in Supabase SQL Editor

-- ========================================
-- PART 1: ADD COMPOSITE INDEXES
-- ========================================

-- Composite index for sender_id + recipient_id + created_at (optimizes OR queries with ordering)
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient_created
ON public.messages(sender_id, recipient_id, created_at DESC);

-- Composite index for recipient + is_read (fast unread message counts)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread
ON public.messages(recipient_id, is_read)
WHERE is_read = false;

-- Composite index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON public.messages(conversation_id, created_at DESC)
WHERE conversation_id IS NOT NULL;

-- ========================================
-- PART 2: VERIFY EXISTING INDEXES
-- ========================================

-- Check all indexes on messages table
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'messages'
ORDER BY indexname;

-- ========================================
-- PART 3: ANALYZE QUERY PERFORMANCE
-- ========================================

-- Test query performance for fetching user messages
-- Replace 'USER_ID_HERE' with an actual user ID to test
/*
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    id,
    subject,
    content,
    created_at,
    is_read,
    sender_id,
    recipient_id,
    conversation_id
FROM public.messages
WHERE sender_id = 'USER_ID_HERE' OR recipient_id = 'USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 100;
*/

-- ========================================
-- PART 4: UPDATE TABLE STATISTICS
-- ========================================

-- Analyze the messages table to update query planner statistics
ANALYZE public.messages;

-- ========================================
-- PART 5: CHECK RLS POLICIES
-- ========================================

-- Verify RLS policies aren't causing slowdowns
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON INDEX idx_messages_sender_recipient_created IS 'Composite index for fast message fetching with OR conditions on sender/recipient';
COMMENT ON INDEX idx_messages_recipient_unread IS 'Partial index for fast unread message counts per user';
COMMENT ON INDEX idx_messages_conversation_created IS 'Composite index for fast conversation message retrieval';
