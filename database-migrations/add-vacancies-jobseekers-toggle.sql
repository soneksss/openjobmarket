-- Migration: Add vacancies_jobseekers_enabled toggle to admin_settings
-- This controls whether Vacancies and Jobseekers tabs are shown on the main page

-- Add the column to admin_settings table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings'
    AND column_name = 'vacancies_jobseekers_enabled'
  ) THEN
    ALTER TABLE admin_settings ADD COLUMN vacancies_jobseekers_enabled BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added vacancies_jobseekers_enabled column to admin_settings';
  ELSE
    RAISE NOTICE 'vacancies_jobseekers_enabled column already exists';
  END IF;
END $$;

-- Update get_admin_settings function to include the new setting
CREATE OR REPLACE FUNCTION get_admin_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_data json;
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND active = true
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT json_build_object(
    'subscriptions_enabled', COALESCE(subscriptions_enabled, false),
    'signin_required_to_search', COALESCE(signin_required_to_search, false),
    'vacancies_jobseekers_enabled', COALESCE(vacancies_jobseekers_enabled, true),
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

  IF settings_data IS NULL THEN
    settings_data := json_build_object(
      'subscriptions_enabled', false,
      'signin_required_to_search', false,
      'vacancies_jobseekers_enabled', true,
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

-- Update update_admin_settings function to handle the new setting
CREATE OR REPLACE FUNCTION update_admin_settings(settings_json json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  result json;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND active = true
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Update or insert settings
  INSERT INTO admin_settings (
    id,
    subscriptions_enabled,
    signin_required_to_search,
    vacancies_jobseekers_enabled,
    professional_actively_looking_enabled,
    job_posting_free,
    job_posting_default_price,
    enquiry_fee,
    actively_looking_price,
    actively_looking_free,
    updated_at
  )
  VALUES (
    1,
    COALESCE((settings_json->>'subscriptions_enabled')::boolean, false),
    COALESCE((settings_json->>'signin_required_to_search')::boolean, false),
    COALESCE((settings_json->>'vacancies_jobseekers_enabled')::boolean, true),
    COALESCE((settings_json->>'professional_actively_looking_enabled')::boolean, true),
    COALESCE((settings_json->>'job_posting_free')::boolean, true),
    COALESCE((settings_json->>'job_posting_default_price')::numeric, 0.00),
    COALESCE((settings_json->>'enquiry_fee')::numeric, 5.00),
    COALESCE((settings_json->>'actively_looking_price')::numeric, 0.00),
    COALESCE((settings_json->>'actively_looking_free')::boolean, true),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    subscriptions_enabled = COALESCE((settings_json->>'subscriptions_enabled')::boolean, admin_settings.subscriptions_enabled),
    signin_required_to_search = COALESCE((settings_json->>'signin_required_to_search')::boolean, admin_settings.signin_required_to_search),
    vacancies_jobseekers_enabled = COALESCE((settings_json->>'vacancies_jobseekers_enabled')::boolean, admin_settings.vacancies_jobseekers_enabled),
    professional_actively_looking_enabled = COALESCE((settings_json->>'professional_actively_looking_enabled')::boolean, admin_settings.professional_actively_looking_enabled),
    job_posting_free = COALESCE((settings_json->>'job_posting_free')::boolean, admin_settings.job_posting_free),
    job_posting_default_price = COALESCE((settings_json->>'job_posting_default_price')::numeric, admin_settings.job_posting_default_price),
    enquiry_fee = COALESCE((settings_json->>'enquiry_fee')::numeric, admin_settings.enquiry_fee),
    actively_looking_price = COALESCE((settings_json->>'actively_looking_price')::numeric, admin_settings.actively_looking_price),
    actively_looking_free = COALESCE((settings_json->>'actively_looking_free')::boolean, admin_settings.actively_looking_free),
    updated_at = NOW();

  result := json_build_object('success', true);
  RETURN result;
END;
$$;

-- Update get_public_admin_settings to include the new setting
CREATE OR REPLACE FUNCTION get_public_admin_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_data json;
BEGIN
  SELECT json_build_object(
    'subscriptions_enabled', COALESCE(subscriptions_enabled, false),
    'signin_required_to_search', COALESCE(signin_required_to_search, false),
    'vacancies_jobseekers_enabled', COALESCE(vacancies_jobseekers_enabled, true),
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

  IF settings_data IS NULL THEN
    settings_data := json_build_object(
      'subscriptions_enabled', false,
      'signin_required_to_search', false,
      'vacancies_jobseekers_enabled', true,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_public_admin_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_admin_settings() TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added vacancies_jobseekers_enabled toggle';
  RAISE NOTICE 'Run this migration in your Supabase SQL editor';
END $$;
