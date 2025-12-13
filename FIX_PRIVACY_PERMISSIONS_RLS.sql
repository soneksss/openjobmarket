-- Fix RLS policy for employer_privacy_permissions table to allow professionals to insert permissions
-- Run this in your Supabase SQL editor

-- Drop both old and new policy names to ensure clean state
DROP POLICY IF EXISTS "Users can manage privacy permissions they granted" ON public.employer_privacy_permissions;
DROP POLICY IF EXISTS "Professionals can manage their privacy permissions" ON public.employer_privacy_permissions;

-- Create a new policy that allows professionals to insert, update, and delete their own privacy grants
-- The WITH CHECK clause is essential for INSERT operations
-- IMPORTANT: professional_id references professional_profiles.id, so we need to join to check user_id
CREATE POLICY "Professionals can manage their privacy permissions" ON public.employer_privacy_permissions
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM professional_profiles WHERE id = professional_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM professional_profiles WHERE id = professional_id
        )
    );

-- Verify the policy exists
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'employer_privacy_permissions';
