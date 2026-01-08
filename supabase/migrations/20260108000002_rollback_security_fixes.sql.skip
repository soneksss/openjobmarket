-- ROLLBACK: Revert security warning fixes if needed
-- Date: 2026-01-08
-- Description: Use this ONLY if the security fixes break something
-- ⚠️ WARNING: This will disable RLS again - use only for emergency rollback

-- ============================================================================
-- ROLLBACK RLS ON TABLES
-- ============================================================================

-- Only run these if you need to rollback
-- Comment out the ones you want to keep

-- ALTER TABLE public.blocked_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notification_history DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notification_queue DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP POLICIES (if they cause issues)
-- ============================================================================

-- DROP POLICY IF EXISTS "Users manage own blocks" ON public.blocked_users;
-- DROP POLICY IF EXISTS "Users can see where they are blocked" ON public.blocked_users;
-- DROP POLICY IF EXISTS "Users access own conversations" ON public.conversations;
-- DROP POLICY IF EXISTS "Users view own notification history" ON public.notification_history;
-- DROP POLICY IF EXISTS "Service role inserts notifications" ON public.notification_history;
-- DROP POLICY IF EXISTS "Service role only access" ON public.notification_queue;

-- ============================================================================
-- REVERT VIEWS TO SECURITY DEFINER (not recommended)
-- ============================================================================

-- If views need to be SECURITY DEFINER again (avoid if possible):

-- DROP VIEW IF EXISTS public.active_homeowner_jobs CASCADE;
-- CREATE VIEW public.active_homeowner_jobs
-- WITH (security_barrier=true)
-- AS
-- SELECT * FROM ... (your original view definition);

COMMENT ON SCHEMA public IS 'ROLLBACK SCRIPT - Do not run unless necessary';
