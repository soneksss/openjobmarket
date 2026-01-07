-- Migration: Fix users table INSERT policy for signup
-- Date: 2026-01-07
-- Description: Allow users to insert their own record during signup with proper RLS

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Recreate INSERT policy that works during signup
-- This allows INSERT when the user ID matches the authenticated user ID
-- OR when the user is authenticated and inserting their own record
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (
  -- User can insert their own record if authenticated
  auth.uid() = id
);

-- Also need to ensure UPDATE policy allows upsert operations
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add comments
COMMENT ON POLICY "Users can insert their own profile" ON public.users IS
  'Allows authenticated users to insert their own profile record during signup.';

COMMENT ON POLICY "Users can update their own profile" ON public.users IS
  'Allows users to update their own profile.';
