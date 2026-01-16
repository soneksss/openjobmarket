-- Migration: Create public function to get admin settings (accessible to all users)
-- This fixes the 400 error when non-admin users try to access admin settings

-- Create a public function to get admin settings (no admin check required)
-- This function only returns settings that are safe for public access
CREATE OR REPLACE FUNCTION get_public_admin_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_data json;
BEGIN
  -- Get settings (no authentication check needed for public settings)
  SELECT json_build_object(
    'subscriptions_enabled', COALESCE(subscriptions_enabled, false),
    'signin_required_to_search', COALESCE(signin_required_to_search, false),
    'professional_actively_looking_enabled', COALESCE(professional_actively_looking_enabled, true),
    'job_posting_free', COALESCE(job_posting_free, true),
    'job_posting_default_price', COALESCE(job_posting_default_price, 0.00),
    'enquiry_fee', COALESCE(enquiry_fee, 5.00),
    'actively_looking_price', COALESCE(actively_looking_price, 0.00),
    'actively_looking_free', COALESCE(actively_looking_free, true)
  )
  INTO settings_data
  FROM admin_settings
  LIMIT 1;

  -- If no settings exist, return defaults
  IF settings_data IS NULL THEN
    settings_data := json_build_object(
      'subscriptions_enabled', false,
      'signin_required_to_search', false,
      'professional_actively_looking_enabled', true,
      'job_posting_free', true,
      'job_posting_default_price', 0.00,
      'enquiry_fee', 5.00,
      'actively_looking_price', 0.00,
      'actively_looking_free', true
    );
  END IF;

  RETURN settings_data;
END;
$$;

-- Grant execute permission to all users (authenticated and anonymous)
GRANT EXECUTE ON FUNCTION get_public_admin_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_admin_settings() TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully created get_public_admin_settings() function';
  RAISE NOTICE 'This function is accessible to all users without admin privileges';
  RAISE NOTICE 'Replace calls to get_admin_settings() with get_public_admin_settings() in non-admin pages';
END $$;
