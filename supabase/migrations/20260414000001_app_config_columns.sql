-- ============================================================
-- Migration: App config columns on admin_settings
-- Adds layout_version, ui toggles, min_app_version, force_update
-- All columns have safe defaults — zero risk to existing data
-- ============================================================

-- ── Part A: Add new columns ───────────────────────────────────
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS layout_version        TEXT    DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS ui_urgent_jobs_banner BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ui_promotions_banner  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_app_version       TEXT    DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS force_update          BOOLEAN DEFAULT false;

-- ── Part B: Update get_public_admin_settings() ───────────────
-- Preserves all existing fields verbatim; appends new ones.
CREATE OR REPLACE FUNCTION get_public_admin_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_data json;
BEGIN
  SELECT json_build_object(
    -- Existing fields (unchanged)
    'subscriptions_enabled',                 COALESCE(subscriptions_enabled, false),
    'signin_required_to_search',             COALESCE(signin_required_to_search, false),
    'vacancies_jobseekers_enabled',          COALESCE(vacancies_jobseekers_enabled, true),
    'professional_actively_looking_enabled', COALESCE(professional_actively_looking_enabled, true),
    'job_posting_free',                      COALESCE(job_posting_free, true),
    'job_posting_default_price',             COALESCE(job_posting_default_price, 0.00),
    'enquiry_fee',                           COALESCE(enquiry_fee, 5.00),
    'actively_looking_price',                COALESCE(actively_looking_price, 0.00),
    'actively_looking_free',                 COALESCE(actively_looking_free, true),
    -- New app-config fields
    'layout_version',                        COALESCE(layout_version, 'v1'),
    'ui_urgent_jobs_banner',                 COALESCE(ui_urgent_jobs_banner, true),
    'ui_promotions_banner',                  COALESCE(ui_promotions_banner, false),
    'min_app_version',                       COALESCE(min_app_version, '1.0.0'),
    'force_update',                          COALESCE(force_update, false)
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
      'actively_looking_free', true,
      'layout_version', 'v1',
      'ui_urgent_jobs_banner', true,
      'ui_promotions_banner', false,
      'min_app_version', '1.0.0',
      'force_update', false
    );
  END IF;

  RETURN settings_data;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_admin_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_admin_settings() TO anon;

-- ── Part C: Update get_admin_settings() (admin-gated) ────────
CREATE OR REPLACE FUNCTION get_admin_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_data json;
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND active = true
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT json_build_object(
    'subscriptions_enabled',                 COALESCE(subscriptions_enabled, false),
    'signin_required_to_search',             COALESCE(signin_required_to_search, false),
    'vacancies_jobseekers_enabled',          COALESCE(vacancies_jobseekers_enabled, true),
    'professional_actively_looking_enabled', COALESCE(professional_actively_looking_enabled, true),
    'job_posting_free',                      COALESCE(job_posting_free, true),
    'job_posting_default_price',             COALESCE(job_posting_default_price, 0.00),
    'enquiry_fee',                           COALESCE(enquiry_fee, 5.00),
    'actively_looking_price',                COALESCE(actively_looking_price, 0.00),
    'actively_looking_free',                 COALESCE(actively_looking_free, true),
    'layout_version',                        COALESCE(layout_version, 'v1'),
    'ui_urgent_jobs_banner',                 COALESCE(ui_urgent_jobs_banner, true),
    'ui_promotions_banner',                  COALESCE(ui_promotions_banner, false),
    'min_app_version',                       COALESCE(min_app_version, '1.0.0'),
    'force_update',                          COALESCE(force_update, false)
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
      'actively_looking_free', true,
      'layout_version', 'v1',
      'ui_urgent_jobs_banner', true,
      'ui_promotions_banner', false,
      'min_app_version', '1.0.0',
      'force_update', false
    );
  END IF;

  RETURN settings_data;
END;
$$;

-- ── Part D: Update update_admin_settings() ───────────────────
-- Extends the INSERT + ON CONFLICT DO UPDATE with the new columns.
CREATE OR REPLACE FUNCTION update_admin_settings(settings_json json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  result json;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND active = true
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

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
    layout_version,
    ui_urgent_jobs_banner,
    ui_promotions_banner,
    min_app_version,
    force_update,
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
    COALESCE(settings_json->>'layout_version', 'v1'),
    COALESCE((settings_json->>'ui_urgent_jobs_banner')::boolean, true),
    COALESCE((settings_json->>'ui_promotions_banner')::boolean, false),
    COALESCE(settings_json->>'min_app_version', '1.0.0'),
    COALESCE((settings_json->>'force_update')::boolean, false),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    subscriptions_enabled                 = COALESCE((settings_json->>'subscriptions_enabled')::boolean,                 admin_settings.subscriptions_enabled),
    signin_required_to_search             = COALESCE((settings_json->>'signin_required_to_search')::boolean,             admin_settings.signin_required_to_search),
    vacancies_jobseekers_enabled          = COALESCE((settings_json->>'vacancies_jobseekers_enabled')::boolean,          admin_settings.vacancies_jobseekers_enabled),
    professional_actively_looking_enabled = COALESCE((settings_json->>'professional_actively_looking_enabled')::boolean, admin_settings.professional_actively_looking_enabled),
    job_posting_free                      = COALESCE((settings_json->>'job_posting_free')::boolean,                      admin_settings.job_posting_free),
    job_posting_default_price             = COALESCE((settings_json->>'job_posting_default_price')::numeric,             admin_settings.job_posting_default_price),
    enquiry_fee                           = COALESCE((settings_json->>'enquiry_fee')::numeric,                           admin_settings.enquiry_fee),
    actively_looking_price                = COALESCE((settings_json->>'actively_looking_price')::numeric,                admin_settings.actively_looking_price),
    actively_looking_free                 = COALESCE((settings_json->>'actively_looking_free')::boolean,                 admin_settings.actively_looking_free),
    layout_version                        = COALESCE(settings_json->>'layout_version',                                   admin_settings.layout_version),
    ui_urgent_jobs_banner                 = COALESCE((settings_json->>'ui_urgent_jobs_banner')::boolean,                 admin_settings.ui_urgent_jobs_banner),
    ui_promotions_banner                  = COALESCE((settings_json->>'ui_promotions_banner')::boolean,                  admin_settings.ui_promotions_banner),
    min_app_version                       = COALESCE(settings_json->>'min_app_version',                                  admin_settings.min_app_version),
    force_update                          = COALESCE((settings_json->>'force_update')::boolean,                          admin_settings.force_update),
    updated_at                            = NOW();

  result := json_build_object('success', true);
  RETURN result;
END;
$$;

-- ── Verification ─────────────────────────────────────────────
DO $$
DECLARE
  v_layout_col   boolean;
  v_force_col    boolean;
  v_min_ver_col  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'layout_version'
  ) INTO v_layout_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'force_update'
  ) INTO v_force_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'min_app_version'
  ) INTO v_min_ver_col;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'layout_version column    : %', CASE WHEN v_layout_col  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'force_update column      : %', CASE WHEN v_force_col   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'min_app_version column   : %', CASE WHEN v_min_ver_col THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE '✅ Migration 20260414000001 complete';
END;
$$;
