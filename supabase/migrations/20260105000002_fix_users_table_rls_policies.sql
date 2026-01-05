-- Migration: Fix RLS policies for users table
-- Date: 2026-01-05
-- Description: Ensures users can insert their own records during signup

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- CREATE policy for users to SELECT their own profile
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- CREATE policy for users to UPDATE their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- CRITICAL: CREATE policy for users to INSERT their own profile during signup
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Optional: Allow admins to view all users (if you have an admin system)
-- Uncomment if needed:
-- CREATE POLICY "Admins can view all users"
-- ON public.users
-- FOR SELECT
-- USING (
--   auth.uid() IN (SELECT user_id FROM public.admin_users)
-- );
