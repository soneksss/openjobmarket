-- Migration: Create is_signin_required_to_search function
-- Date: 2026-01-10
-- Description: Creates RPC function to check if sign-in is required for job search

-- ============================================================================
-- PART 1: ENSURE admin_settings HAS signin_required_to_search COLUMN
-- ============================================================================

-- Add column if it doesn't exist (defaults to FALSE = no signin required)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_settings'
      AND column_name = 'signin_required_to_search'
  ) THEN
    ALTER TABLE admin_settings
    ADD COLUMN signin_required_to_search BOOLEAN DEFAULT FALSE NOT NULL;

    COMMENT ON COLUMN admin_settings.signin_required_to_search IS
      'Whether users must sign in to search for jobs/professionals/traders';
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE FUNCTION TO CHECK SIGNIN REQUIREMENT
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.is_signin_required_to_search();

-- Create function to check if sign-in is required
CREATE OR REPLACE FUNCTION public.is_signin_required_to_search()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signin_required BOOLEAN;
BEGIN
  -- Check admin settings for signin requirement
  -- If no settings exist or signin_required_to_search is NULL, default to FALSE (no signin required)
  SELECT COALESCE(signin_required_to_search, FALSE)
  INTO signin_required
  FROM admin_settings
  LIMIT 1;

  -- If no admin_settings row exists, return FALSE (no signin required)
  IF signin_required IS NULL THEN
    signin_required := FALSE;
  END IF;

  RETURN signin_required;
END;
$$;

COMMENT ON FUNCTION public.is_signin_required_to_search() IS
  'Returns whether users must sign in to search for jobs. Checks admin_settings.signin_required_to_search.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_signin_required_to_search() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_signin_required_to_search() TO anon;
