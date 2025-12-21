-- Migration: Add signin_required_to_search setting to admin_settings
-- This adds a new column to control whether users must sign in before searching

-- Add the new column to admin_settings table
ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS signin_required_to_search boolean DEFAULT false;

-- Drop existing functions to allow recreation
DROP FUNCTION IF EXISTS get_admin_settings();
DROP FUNCTION IF EXISTS update_admin_settings(json);

-- Update the get_admin_settings function to include the new field
CREATE OR REPLACE FUNCTION get_admin_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_data json;
  is_admin boolean;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is admin
  SELECT user_type = 'admin' INTO is_admin
  FROM users
  WHERE id = auth.uid();

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Get settings
  SELECT json_build_object(
    'subscriptions_enabled', COALESCE(subscriptions_enabled, false),
    'signin_required_to_search', COALESCE(signin_required_to_search, false)
  )
  INTO settings_data
  FROM admin_settings
  LIMIT 1;

  -- If no settings exist, create default settings
  IF settings_data IS NULL THEN
    INSERT INTO admin_settings (subscriptions_enabled, signin_required_to_search)
    VALUES (false, false)
    RETURNING json_build_object(
      'subscriptions_enabled', subscriptions_enabled,
      'signin_required_to_search', signin_required_to_search
    ) INTO settings_data;
  END IF;

  RETURN settings_data;
END;
$$;

-- Update the update_admin_settings function to handle the new field
CREATE OR REPLACE FUNCTION update_admin_settings(settings_json json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  result_data json;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is admin
  SELECT user_type = 'admin' INTO is_admin
  FROM users
  WHERE id = auth.uid();

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Update the first (and should be only) row in admin_settings
  UPDATE admin_settings
  SET
    subscriptions_enabled = (settings_json->>'subscriptions_enabled')::boolean,
    signin_required_to_search = (settings_json->>'signin_required_to_search')::boolean,
    updated_at = now()
  WHERE id = (SELECT id FROM admin_settings LIMIT 1);

  -- If no row exists, insert one
  IF NOT FOUND THEN
    INSERT INTO admin_settings (
      subscriptions_enabled,
      signin_required_to_search
    )
    VALUES (
      (settings_json->>'subscriptions_enabled')::boolean,
      (settings_json->>'signin_required_to_search')::boolean
    );
  END IF;

  -- Return updated settings
  SELECT json_build_object(
    'subscriptions_enabled', subscriptions_enabled,
    'signin_required_to_search', signin_required_to_search
  )
  INTO result_data
  FROM admin_settings
  LIMIT 1;

  RETURN result_data;
END;
$$;

-- Create a public function to check if sign-in is required (accessible to all users)
CREATE OR REPLACE FUNCTION is_signin_required_to_search()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signin_required boolean;
BEGIN
  -- Get the setting value
  SELECT COALESCE(signin_required_to_search, false)
  INTO signin_required
  FROM admin_settings
  LIMIT 1;

  RETURN COALESCE(signin_required, false);
END;
$$;

-- Grant execute permission to all authenticated and anonymous users
GRANT EXECUTE ON FUNCTION is_signin_required_to_search() TO authenticated;
GRANT EXECUTE ON FUNCTION is_signin_required_to_search() TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added signin_required_to_search setting to admin_settings';
  RAISE NOTICE 'Updated get_admin_settings and update_admin_settings functions';
  RAISE NOTICE 'Created is_signin_required_to_search() function for public access';
END $$;
