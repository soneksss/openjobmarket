-- =====================================================
-- DROP SPECIFIC TRIGGERS ON MESSAGES TABLE
-- =====================================================
-- Drop the two triggers we found:
-- 1. notify_new_message
-- 2. trigger_verify_interaction
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Dropping specific triggers on messages';
    RAISE NOTICE '====================================';
END $$;

-- Drop the two specific triggers
DROP TRIGGER IF EXISTS notify_new_message ON public.messages CASCADE;
DROP TRIGGER IF EXISTS trigger_verify_interaction ON public.messages CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✓ Dropped notify_new_message trigger';
    RAISE NOTICE '✓ Dropped trigger_verify_interaction trigger';
END $$;

-- Now drop their associated functions (CASCADE will drop any other dependent objects)
DROP FUNCTION IF EXISTS public.notify_new_message() CASCADE;
DROP FUNCTION IF EXISTS public.verify_interaction() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_message() CASCADE;
DROP FUNCTION IF EXISTS public.check_interaction() CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✓ Dropped associated functions';
END $$;

-- Verify they're gone
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgrelid = 'public.messages'::regclass
    AND NOT tgisinternal;

    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    IF trigger_count = 0 THEN
        RAISE NOTICE '✓ SUCCESS: All triggers removed!';
        RAISE NOTICE '   Messages table has 0 triggers';
    ELSE
        RAISE NOTICE '⚠ WARNING: % triggers still remain', trigger_count;
    END IF;
    RAISE NOTICE '====================================';
END $$;

-- Show remaining triggers (should be none)
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgrelid = 'public.messages'::regclass
  AND NOT tgisinternal;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✓ COMPLETED';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Dropped triggers:';
    RAISE NOTICE '  - notify_new_message';
    RAISE NOTICE '  - trigger_verify_interaction';
    RAISE NOTICE '';
    RAISE NOTICE 'Check the query results above.';
    RAISE NOTICE 'There should be NO triggers listed.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Try sending a message!';
    RAISE NOTICE '====================================';
END $$;
