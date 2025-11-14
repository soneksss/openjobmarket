-- =====================================================
-- NUCLEAR OPTION: REMOVE ALL TRIGGERS FROM MESSAGES
-- =====================================================
-- This script removes ALL triggers and functions from messages table
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'REMOVING ALL TRIGGERS FROM MESSAGES';
    RAISE NOTICE '====================================';
END $$;

-- Step 1: List all current triggers
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    RAISE NOTICE 'Current triggers on messages table:';
    FOR trigger_rec IN
        SELECT tgname, pg_get_triggerdef(oid) as definition
        FROM pg_trigger
        WHERE tgrelid = 'public.messages'::regclass
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE '  - Trigger: %', trigger_rec.tgname;
        RAISE NOTICE '    Definition: %', trigger_rec.definition;
    END LOOP;
END $$;

-- Step 2: Drop EVERY trigger on messages table
DO $$
DECLARE
    trigger_rec RECORD;
    drop_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Dropping all triggers...';

    FOR trigger_rec IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'public.messages'::regclass
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE '  Dropping trigger: %', trigger_rec.tgname;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.messages', trigger_rec.tgname);
        drop_count := drop_count + 1;
    END LOOP;

    IF drop_count > 0 THEN
        RAISE NOTICE '✓ Dropped % triggers', drop_count;
    ELSE
        RAISE NOTICE '- No triggers found to drop';
    END IF;
END $$;

-- Step 3: Find and list all functions that might be related
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Functions that mention messages or receiver:';
    FOR func_rec IN
        SELECT
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (
            pg_get_functiondef(p.oid) ILIKE '%messages%'
            OR pg_get_functiondef(p.oid) ILIKE '%receiver%'
        )
    LOOP
        RAISE NOTICE '  - Function: %.%', func_rec.schema_name, func_rec.function_name;
        IF func_rec.definition ILIKE '%receiver_id%' THEN
            RAISE NOTICE '    ⚠ Contains receiver_id reference!';
        END IF;
    END LOOP;
END $$;

-- Step 4: Drop functions that use receiver_id (CASCADE to drop dependent triggers)
DO $$
DECLARE
    func_rec RECORD;
    drop_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Dropping functions that use receiver_id...';

    FOR func_rec IN
        SELECT
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND pg_get_functiondef(p.oid) ILIKE '%receiver_id%'
    LOOP
        RAISE NOTICE '  Dropping function: %.%', func_rec.schema_name, func_rec.function_name;
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I CASCADE', func_rec.schema_name, func_rec.function_name);
        drop_count := drop_count + 1;
    END LOOP;

    IF drop_count > 0 THEN
        RAISE NOTICE '✓ Dropped % functions', drop_count;
    ELSE
        RAISE NOTICE '- No functions with receiver_id found';
    END IF;
END $$;

-- Step 5: Verify all triggers are gone
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
        RAISE NOTICE '✓ SUCCESS: All triggers removed';
    ELSE
        RAISE NOTICE '⚠ WARNING: % triggers still remain', trigger_count;
    END IF;
    RAISE NOTICE '====================================';
END $$;

-- Step 6: Show remaining triggers (should be none)
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Remaining triggers on messages table:';
    FOR trigger_rec IN
        SELECT tgname, pg_get_triggerdef(oid) as definition
        FROM pg_trigger
        WHERE tgrelid = 'public.messages'::regclass
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE '  - %: %', trigger_rec.tgname, trigger_rec.definition;
    END LOOP;
END $$;

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
    RAISE NOTICE 'All triggers have been removed from messages table.';
    RAISE NOTICE 'You can now send messages without trigger errors.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Try sending a message again';
    RAISE NOTICE '====================================';
END $$;
