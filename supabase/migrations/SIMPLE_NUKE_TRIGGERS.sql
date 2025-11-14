-- =====================================================
-- SIMPLE TRIGGER REMOVAL FOR MESSAGES
-- =====================================================
-- Simplified approach to avoid aggregate function errors
-- =====================================================

-- First, let's just drop ALL triggers by name that might exist
DROP TRIGGER IF EXISTS validate_message_receiver ON public.messages CASCADE;
DROP TRIGGER IF EXISTS check_message_receiver ON public.messages CASCADE;
DROP TRIGGER IF EXISTS validate_receiver ON public.messages CASCADE;
DROP TRIGGER IF EXISTS check_receiver ON public.messages CASCADE;
DROP TRIGGER IF EXISTS message_receiver_check ON public.messages CASCADE;
DROP TRIGGER IF EXISTS ensure_valid_receiver ON public.messages CASCADE;
DROP TRIGGER IF EXISTS set_timestamp ON public.messages CASCADE;
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages CASCADE;
DROP TRIGGER IF EXISTS handle_updated_at ON public.messages CASCADE;

-- Drop any functions that might use receiver_id
DROP FUNCTION IF EXISTS public.validate_message_receiver CASCADE;
DROP FUNCTION IF EXISTS public.check_message_receiver CASCADE;
DROP FUNCTION IF EXISTS public.validate_receiver CASCADE;
DROP FUNCTION IF EXISTS public.check_receiver CASCADE;
DROP FUNCTION IF EXISTS public.message_receiver_check CASCADE;
DROP FUNCTION IF EXISTS public.ensure_valid_receiver CASCADE;

-- Show what we're looking for
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Checking for remaining triggers...';
    RAISE NOTICE '====================================';
END $$;

-- Query to list remaining triggers (simpler approach)
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgrelid = 'public.messages'::regclass
  AND NOT tgisinternal;

-- If the above shows any triggers, manually add DROP statements above and re-run

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✓ COMPLETED';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Common triggers have been dropped.';
    RAISE NOTICE 'Check the query results above.';
    RAISE NOTICE 'If any triggers are shown, note their names';
    RAISE NOTICE 'and we will drop them specifically.';
    RAISE NOTICE '====================================';
END $$;
