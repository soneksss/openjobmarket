-- =====================================================
-- DIAGNOSE MESSAGES TABLE
-- =====================================================
-- This script checks everything about the messages table
-- =====================================================

-- Check 1: Table structure
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'MESSAGES TABLE STRUCTURE';
    RAISE NOTICE '====================================';
END $$;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check 2: Constraints
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'CONSTRAINTS ON MESSAGES TABLE';
    RAISE NOTICE '====================================';
END $$;

SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.messages'::regclass;

-- Check 3: Triggers
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'TRIGGERS ON MESSAGES TABLE';
    RAISE NOTICE '====================================';
END $$;

SELECT
    tgname AS trigger_name,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.messages'::regclass
    AND NOT tgisinternal;

-- Check 4: RLS Policies
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'RLS POLICIES ON MESSAGES TABLE';
    RAISE NOTICE '====================================';
END $$;

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

-- Check 5: Foreign Keys
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'FOREIGN KEYS ON MESSAGES TABLE';
    RAISE NOTICE '====================================';
END $$;

SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'messages'
    AND tc.table_schema = 'public';

-- Check 6: Test insert permissions
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'TESTING INSERT PERMISSIONS';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Note: This will show if RLS is blocking inserts';
    RAISE NOTICE 'You need to be logged in to test this properly';
END $$;
