-- =====================================================
-- FIX MESSAGES TABLE RLS POLICIES
-- =====================================================
-- This script ensures proper policies for message sending
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Fixing messages table RLS policies';
    RAISE NOTICE '====================================';
END $$;

-- Step 1: Check current state
DO $$
DECLARE
    has_rls BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO has_rls
    FROM pg_class
    WHERE relname = 'messages' AND relnamespace = 'public'::regnamespace;

    IF has_rls THEN
        RAISE NOTICE 'RLS is currently ENABLED on messages table';
    ELSE
        RAISE NOTICE 'RLS is currently DISABLED on messages table';
    END IF;
END $$;

-- Step 2: Drop all existing policies on messages
DO $$
DECLARE
    policy_rec RECORD;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Dropping existing policies on messages...';

    -- Drop policies using dynamic SQL with error handling
    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can send messages" ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can insert messages" ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view messages they sent" ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view messages they received" ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Messages are viewable by sender and recipient" ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Messages can be inserted by authenticated users" ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Recipients can update message read status" ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RAISE NOTICE '✓ Dropped existing policies';
END $$;

-- Step 3: Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✓ Enabled RLS on messages table';
END $$;

-- Step 4: Create comprehensive policies

-- POLICY 1: Users can view messages they sent or received
CREATE POLICY "Messages are viewable by sender and recipient"
ON public.messages
FOR SELECT
USING (
    auth.uid() = sender_id
    OR
    auth.uid() = recipient_id
);

-- POLICY 2: Authenticated users can send messages
CREATE POLICY "Messages can be inserted by authenticated users"
ON public.messages
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND sender_id IS NOT NULL
    AND recipient_id IS NOT NULL
    AND sender_id != recipient_id
);

-- POLICY 3: Recipients can mark messages as read
CREATE POLICY "Recipients can update message read status"
ON public.messages
FOR UPDATE
USING (
    auth.uid() = recipient_id
)
WITH CHECK (
    auth.uid() = recipient_id
);

DO $$
BEGIN
    RAISE NOTICE '✓ Created new RLS policies for messages';
END $$;

-- Step 5: Verify policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'messages' AND schemaname = 'public';

    RAISE NOTICE '====================================';
    RAISE NOTICE 'Messages table now has % policies', policy_count;
    RAISE NOTICE '====================================';
END $$;

-- Step 6: List all policies
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    RAISE NOTICE 'Current policies on messages table:';
    FOR policy_rec IN
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'messages' AND schemaname = 'public'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '  - % (FOR %)', policy_rec.policyname, policy_rec.cmd;
    END LOOP;
END $$;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✓ MESSAGES POLICIES FIXED';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Policies created:';
    RAISE NOTICE '1. Messages viewable by sender/recipient';
    RAISE NOTICE '2. Authenticated users can send messages';
    RAISE NOTICE '3. Recipients can mark as read';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Try sending a message again';
    RAISE NOTICE '====================================';
END $$;
