-- ============================================================================
-- Migration: Founding Member Programme / Launch Mode
-- ============================================================================
-- "Launch Mode" is not a new toggle — it's a UI/behaviour reframing of the
-- existing admin_settings.subscriptions_enabled gate: Launch Mode ON means
-- subscriptions_enabled = false (current default), Launch Mode OFF means
-- subscriptions_enabled = true. Keeping one source of truth avoids the two
-- flags ever disagreeing.
--
-- New pieces:
--   company_profiles.founding_member  — set once at signup if Launch Mode was
--     ON at the time, and never unset (permanent badge, per spec).
--   admin_settings.founding_member_headline / _body — admin-editable copy for
--     the Billing page / landing page Founding Member messaging.
--   admin_settings.billing_grace_period_days — how long existing members get
--     before they can be pushed to 'expired' after Launch Mode ends.
--   admin_settings.launch_mode_ended_at — set automatically (once) the first
--     time subscriptions_enabled flips false → true, via trigger. Anchors the
--     grace period.
--   get_company_membership_status() gains a 'grace_period' status between
--     'active_paid pending selection' and 'expired'.
-- ============================================================================

-- ── Part A: new columns ─────────────────────────────────────────────────────

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS founding_member BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS founding_member_headline    TEXT DEFAULT '🚀 Founding Member Programme',
  ADD COLUMN IF NOT EXISTS founding_member_body         TEXT DEFAULT 'Open Job Market is currently FREE while we build a strong local community of tradespeople and homeowners in Portsmouth.',
  ADD COLUMN IF NOT EXISTS billing_grace_period_days    INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS launch_mode_ended_at         TIMESTAMPTZ DEFAULT NULL;

-- ── Part B: auto-stamp launch_mode_ended_at on the false→true transition ───

CREATE OR REPLACE FUNCTION public.admin_settings_stamp_launch_mode_end()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.subscriptions_enabled = true
     AND COALESCE(OLD.subscriptions_enabled, false) = false
     AND NEW.launch_mode_ended_at IS NULL THEN
    NEW.launch_mode_ended_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_settings_launch_mode_end ON public.admin_settings;
CREATE TRIGGER trg_admin_settings_launch_mode_end
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_settings_stamp_launch_mode_end();

-- ── Part C: founding_member assignment at signup ────────────────────────────
-- Everything else in this function is unchanged verbatim from 20260715000003;
-- only the company_profiles INSERT gains a founding_member value.

CREATE OR REPLACE FUNCTION public.complete_user_profile_after_verification(
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
  v_account_type TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_company_name TEXT;
  v_nickname TEXT;
  v_title TEXT;
  v_bio TEXT;
  v_experience_level TEXT;
  v_skills TEXT[];
  v_industry TEXT;
  v_company_bio TEXT;
  v_services TEXT[];
  v_phone TEXT;
  v_location TEXT;
  v_latitude DOUBLE PRECISION;
  v_longitude DOUBLE PRECISION;
  v_country TEXT;
  v_user_email TEXT;
  v_raw_meta_data JSONB;
  v_profile_exists BOOLEAN := FALSE;
  v_founding_member BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE 'Completing user profile after email verification for user: %', p_user_id;

  -- Get user data from users table
  SELECT user_type, account_type, email
  INTO v_user_type, v_account_type, v_user_email
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in public.users table'
    );
  END IF;

  -- Get auth user metadata
  SELECT raw_user_meta_data
  INTO v_raw_meta_data
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users table'
    );
  END IF;

  -- Extract metadata
  v_first_name := COALESCE((v_raw_meta_data->>'first_name')::TEXT, '');
  v_last_name := COALESCE((v_raw_meta_data->>'last_name')::TEXT, '');
  v_company_name := COALESCE((v_raw_meta_data->>'company_name')::TEXT, '');
  v_nickname := (v_raw_meta_data->>'nickname')::TEXT;
  v_title := (v_raw_meta_data->>'title')::TEXT;
  v_bio := (v_raw_meta_data->>'bio')::TEXT;
  v_experience_level := COALESCE((v_raw_meta_data->>'experience_level')::TEXT, 'mid');
  v_industry := (v_raw_meta_data->>'industry')::TEXT;
  v_company_bio := (v_raw_meta_data->>'company_bio')::TEXT;
  v_phone := (v_raw_meta_data->>'phone')::TEXT;
  v_location := (v_raw_meta_data->>'location')::TEXT;
  v_latitude := (v_raw_meta_data->>'latitude')::DOUBLE PRECISION;
  v_longitude := (v_raw_meta_data->>'longitude')::DOUBLE PRECISION;
  v_country := (v_raw_meta_data->>'country')::TEXT;

  -- Provide defaults for NOT NULL fields
  IF v_first_name = '' THEN
    v_first_name := 'User';
  END IF;

  IF v_last_name = '' THEN
    v_last_name := SPLIT_PART(v_user_email, '@', 1);
  END IF;

  IF v_company_name = '' THEN
    v_company_name := 'Company';
  END IF;

  -- Parse JSON arrays
  BEGIN
    IF v_raw_meta_data->>'skills' IS NOT NULL THEN
      v_skills := ARRAY(SELECT json_array_elements_text((v_raw_meta_data->>'skills')::JSON));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_skills := NULL;
  END;

  BEGIN
    IF v_raw_meta_data->>'services' IS NOT NULL THEN
      v_services := ARRAY(SELECT json_array_elements_text((v_raw_meta_data->>'services')::JSON));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_services := NULL;
  END;

  -- Check if profile already exists
  -- Business accounts with user_type 'company' get company_profiles
  IF v_account_type = 'business' AND v_user_type = 'company' THEN
    SELECT EXISTS(SELECT 1 FROM company_profiles WHERE user_id = p_user_id) INTO v_profile_exists;
  ELSIF v_user_type IN ('professional', 'jobseeker') THEN
    SELECT EXISTS(SELECT 1 FROM professional_profiles WHERE user_id = p_user_id) INTO v_profile_exists;
  ELSIF v_user_type = 'homeowner' THEN
    SELECT EXISTS(SELECT 1 FROM homeowner_profiles WHERE user_id = p_user_id) INTO v_profile_exists;
  END IF;

  IF v_profile_exists THEN
    RAISE NOTICE 'Profile already exists for user %, skipping creation', p_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Profile already exists',
      'user_id', p_user_id
    );
  END IF;

  -- Create appropriate profile based on account_type and user_type
  -- Business accounts with user_type 'company' get company_profiles
  IF v_account_type = 'business' AND v_user_type = 'company' THEN
    SELECT NOT COALESCE(subscriptions_enabled, false) INTO v_founding_member FROM public.admin_settings LIMIT 1;

    INSERT INTO public.company_profiles (
      user_id,
      company_name,
      industry,
      description,
      services,
      location,
      latitude,
      longitude,
      founding_member,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      v_company_name,
      v_industry,
      v_company_bio,
      v_services,
      v_location,
      v_latitude,
      v_longitude,
      COALESCE(v_founding_member, true),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Created company profile for user % (founding_member: %)', p_user_id, v_founding_member;

    -- Referral capture: this signup call already carries the full profile
    -- (name/services/location), so account-creation and profile-completion
    -- are the same moment here — record the referral and resolve its reward
    -- in one step. Never fails the signup: any error is swallowed + logged.
    DECLARE
      v_referral_code TEXT;
      v_apply_result  JSON;
    BEGIN
      v_referral_code := NULLIF(trim(both from (v_raw_meta_data->>'referral_code')::TEXT), '');
      IF v_referral_code IS NOT NULL THEN
        v_apply_result := public.apply_referral(p_user_id, v_referral_code);
        IF COALESCE((v_apply_result->>'success')::boolean, false) THEN
          PERFORM public.complete_referral_reward(p_user_id);
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Referral capture failed for user % (SQLSTATE: %): %', p_user_id, SQLSTATE, SQLERRM;
    END;

  ELSE
    -- Individual accounts OR business accounts that aren't companies (e.g., tradespeople)
    IF v_user_type IN ('professional', 'jobseeker') OR
       (SELECT is_jobseeker FROM public.users WHERE id = p_user_id) OR
       (SELECT is_tradespeople FROM public.users WHERE id = p_user_id) THEN
      INSERT INTO public.professional_profiles (
        user_id,
        first_name,
        last_name,
        nickname,
        title,
        bio,
        experience_level,
        skills,
        location,
        latitude,
        longitude,
        is_self_employed,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        v_first_name,
        v_last_name,
        v_nickname,
        v_title,
        v_bio,
        v_experience_level::experience_level,
        v_skills,
        v_location,
        v_latitude,
        v_longitude,
        -- Business accounts with professional profiles are self-employed
        v_account_type = 'business',
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;

      RAISE NOTICE 'Created professional profile for user % (is_self_employed: %)', p_user_id, v_account_type = 'business';

    ELSIF v_user_type = 'homeowner' OR
          (SELECT is_homeowner FROM public.users WHERE id = p_user_id) THEN
      INSERT INTO public.homeowner_profiles (
        user_id,
        first_name,
        last_name,
        nickname,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        v_first_name,
        v_last_name,
        v_nickname,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;

      RAISE NOTICE 'Created homeowner profile for user %', p_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User profile completed successfully',
    'user_id', p_user_id,
    'user_type', v_user_type,
    'account_type', v_account_type
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_user_profile_after_verification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_profile_after_verification(UUID) TO service_role;

-- ── Part D: get_company_membership_status — grace_period + founding member ─

CREATE OR REPLACE FUNCTION public.get_company_membership_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings     RECORD;
  v_company      RECORD;
  v_plan         JSON;
  v_status       TEXT;
  v_grace_ends_at TIMESTAMPTZ;
BEGIN
  SELECT
    COALESCE(subscriptions_enabled, false)      AS subscriptions_enabled,
    COALESCE(founding_member_headline, '')      AS founding_member_headline,
    COALESCE(founding_member_body, '')          AS founding_member_body,
    COALESCE(billing_grace_period_days, 30)     AS billing_grace_period_days,
    launch_mode_ended_at
  INTO v_settings
  FROM public.admin_settings LIMIT 1;

  SELECT * INTO v_company FROM public.company_profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company profile % not found', p_user_id;
  END IF;

  IF v_settings.launch_mode_ended_at IS NOT NULL THEN
    v_grace_ends_at := v_settings.launch_mode_ended_at + (v_settings.billing_grace_period_days || ' days')::interval;
  END IF;

  IF NOT v_settings.subscriptions_enabled THEN
    v_status := 'platform_free';
  ELSIF v_company.free_active_until IS NOT NULL AND v_company.free_active_until > now() THEN
    v_status := CASE WHEN v_company.first_job_completed_at IS NULL THEN 'trial_bonus' ELSE 'reward' END;
  ELSIF v_company.first_job_completed_at IS NULL THEN
    v_status := 'trial';
  ELSIF v_company.membership_plan_id IS NOT NULL THEN
    v_status := 'active_paid';
  ELSIF v_grace_ends_at IS NOT NULL AND now() < v_grace_ends_at THEN
    v_status := 'grace_period';
  ELSE
    v_status := 'expired';
  END IF;

  IF v_company.membership_plan_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', id, 'key', key, 'name', name, 'price_pence', price_pence,
      'billing_interval', billing_interval, 'map_marker_color', map_marker_color,
      'features', features
    ) INTO v_plan
    FROM public.membership_plans WHERE id = v_company.membership_plan_id;
  END IF;

  RETURN json_build_object(
    'status',                      v_status,
    'subscriptions_enabled',       v_settings.subscriptions_enabled,
    'first_job_completed_at',      v_company.first_job_completed_at,
    'free_active_until',           v_company.free_active_until,
    'membership_plan',             v_plan,
    'membership_plan_selected_at', v_company.membership_plan_selected_at,
    'referral_code',               v_company.referral_code,
    'founding_member',             v_company.founding_member,
    'founding_member_headline',    v_settings.founding_member_headline,
    'founding_member_body',        v_settings.founding_member_body,
    'grace_period_ends_at',        v_grace_ends_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_membership_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_membership_status(UUID) TO service_role;

-- ── Part E: admin_settings JSON RPCs — extend with the 4 new columns ───────

CREATE OR REPLACE FUNCTION get_public_admin_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_data json;
BEGIN
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
    'force_update',                          COALESCE(force_update, false),
    'referral_program_enabled',              COALESCE(referral_program_enabled, true),
    'referral_reward_days_referrer',         COALESCE(referral_reward_days_referrer, 30),
    'referral_reward_days_referred',         COALESCE(referral_reward_days_referred, 30),
    'first_job_reward_days',                 COALESCE(first_job_reward_days, 30),
    'founding_member_headline',              COALESCE(founding_member_headline, ''),
    'founding_member_body',                  COALESCE(founding_member_body, ''),
    'billing_grace_period_days',             COALESCE(billing_grace_period_days, 30),
    'launch_mode_ended_at',                  launch_mode_ended_at
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
      'force_update', false,
      'referral_program_enabled', true,
      'referral_reward_days_referrer', 30,
      'referral_reward_days_referred', 30,
      'first_job_reward_days', 30,
      'founding_member_headline', '🚀 Founding Member Programme',
      'founding_member_body', '',
      'billing_grace_period_days', 30,
      'launch_mode_ended_at', null
    );
  END IF;

  RETURN settings_data;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_admin_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_admin_settings() TO anon;

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
    'force_update',                          COALESCE(force_update, false),
    'referral_program_enabled',              COALESCE(referral_program_enabled, true),
    'referral_reward_days_referrer',         COALESCE(referral_reward_days_referrer, 30),
    'referral_reward_days_referred',         COALESCE(referral_reward_days_referred, 30),
    'first_job_reward_days',                 COALESCE(first_job_reward_days, 30),
    'founding_member_headline',              COALESCE(founding_member_headline, ''),
    'founding_member_body',                  COALESCE(founding_member_body, ''),
    'billing_grace_period_days',             COALESCE(billing_grace_period_days, 30),
    'launch_mode_ended_at',                  launch_mode_ended_at
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
      'force_update', false,
      'referral_program_enabled', true,
      'referral_reward_days_referrer', 30,
      'referral_reward_days_referred', 30,
      'first_job_reward_days', 30,
      'founding_member_headline', '🚀 Founding Member Programme',
      'founding_member_body', '',
      'billing_grace_period_days', 30,
      'launch_mode_ended_at', null
    );
  END IF;

  RETURN settings_data;
END;
$$;

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
    referral_program_enabled,
    referral_reward_days_referrer,
    referral_reward_days_referred,
    first_job_reward_days,
    founding_member_headline,
    founding_member_body,
    billing_grace_period_days,
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
    COALESCE((settings_json->>'referral_program_enabled')::boolean, true),
    COALESCE((settings_json->>'referral_reward_days_referrer')::integer, 30),
    COALESCE((settings_json->>'referral_reward_days_referred')::integer, 30),
    COALESCE((settings_json->>'first_job_reward_days')::integer, 30),
    COALESCE(settings_json->>'founding_member_headline', '🚀 Founding Member Programme'),
    COALESCE(settings_json->>'founding_member_body', ''),
    COALESCE((settings_json->>'billing_grace_period_days')::integer, 30),
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
    referral_program_enabled              = COALESCE((settings_json->>'referral_program_enabled')::boolean,              admin_settings.referral_program_enabled),
    referral_reward_days_referrer         = COALESCE((settings_json->>'referral_reward_days_referrer')::integer,         admin_settings.referral_reward_days_referrer),
    referral_reward_days_referred         = COALESCE((settings_json->>'referral_reward_days_referred')::integer,         admin_settings.referral_reward_days_referred),
    first_job_reward_days                 = COALESCE((settings_json->>'first_job_reward_days')::integer,                 admin_settings.first_job_reward_days),
    founding_member_headline              = COALESCE(settings_json->>'founding_member_headline',                         admin_settings.founding_member_headline),
    founding_member_body                  = COALESCE(settings_json->>'founding_member_body',                             admin_settings.founding_member_body),
    billing_grace_period_days             = COALESCE((settings_json->>'billing_grace_period_days')::integer,             admin_settings.billing_grace_period_days),
    updated_at                            = NOW();

  result := json_build_object('success', true);
  RETURN result;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20260715000004 (Founding Member Programme / Launch Mode) complete';
END;
$$;
