-- ============================================================================
-- Migration: Membership, Billing, Promo Codes & Referral System — schema (Phase A)
-- ============================================================================
-- New tables:   membership_plans, promo_codes, promo_code_redemptions, referrals
-- New columns:  company_profiles (trial/reward/plan/referral state),
--               admin_settings (referral programme config)
-- New functions:
--   generate_referral_code()              — unique 8-char code generator
--   trg_company_profiles_referral_code     — trigger, assigns code on insert
--   grant_membership_bonus_days(uuid,int) — extends free_active_until, stacking
--   get_company_membership_status(uuid)   — computed trial/reward/paid/expired status
--   redeem_promo_code(uuid,text)          — validates + applies a promo code
--   apply_referral(uuid,text)             — records a pending referral at signup
--   complete_referral_reward(uuid)        — grants both-side reward at profile completion
--
-- Real payment charging is explicitly out of scope (no processor wired up yet).
-- admin_settings.subscriptions_enabled remains the master gate: while it's false,
-- get_company_membership_status() reports 'platform_free' for everyone regardless
-- of trial/reward state, matching the existing free-launch behaviour.
-- ============================================================================

-- ── Part A: membership_plans ────────────────────────────────────────────────
-- Future-proof: plans (and their prices) live in the DB, never hardcoded.

CREATE TABLE IF NOT EXISTS public.membership_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key               TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  price_pence       INTEGER NOT NULL DEFAULT 0,
  billing_interval  TEXT NOT NULL DEFAULT 'month',
  map_marker_color  TEXT,
  features          JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.membership_plans (key, name, price_pence, map_marker_color, features, sort_order)
VALUES
  ('passive', 'Passive Tradesperson', 1000, 'grey',
    '["Grey map marker","Business profile visible on the map","Browse and apply for trade jobs","Standard notifications"]'::jsonb, 1),
  ('active', 'Active Tradesperson', 2000, 'green',
    '["Everything in Passive","Available Now toggle","Green highlighted map marker","Priority job notifications","Higher search visibility"]'::jsonb, 2)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_plans_select_active ON public.membership_plans;
CREATE POLICY membership_plans_select_active ON public.membership_plans
  FOR SELECT USING (is_active = true);

-- ── Part B: company_profiles — trial/reward/plan/referral state ────────────

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS first_job_completed_at      TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS free_active_until            TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS membership_plan_id           UUID REFERENCES public.membership_plans(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS membership_plan_selected_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referral_code                TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code             TEXT DEFAULT NULL;

COMMENT ON COLUMN company_profiles.first_job_completed_at IS 'Set once, when this tradesperson''s first job reaches COMPLETED status. Ends the indefinite free trial.';
COMMENT ON COLUMN company_profiles.free_active_until IS 'Guaranteed free Active Membership through this timestamp. Stacks from the 30-day first-job reward, promo codes, and referral rewards — never moves backward.';
COMMENT ON COLUMN company_profiles.membership_plan_id IS 'Plan the tradesperson has selected. Informational until a payment processor is wired up (subscriptions_enabled gate).';
COMMENT ON COLUMN company_profiles.referral_code IS 'This company''s own unique referral code, auto-generated on profile creation.';
COMMENT ON COLUMN company_profiles.referred_by_code IS 'The referral_code used at signup, if any. Captured for audit even if the referrals row is later resolved.';

-- Unique referral code generator (retries on collision — 8 hex chars is ~4B
-- combinations, collision is only a theoretical concern, but loop is cheap insurance).
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
BEGIN
  LOOP
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.company_profiles WHERE referral_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.company_profiles_assign_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_profiles_referral_code ON public.company_profiles;
CREATE TRIGGER trg_company_profiles_referral_code
  BEFORE INSERT ON public.company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.company_profiles_assign_referral_code();

-- Backfill existing rows (one function call per row assigns a distinct code)
UPDATE public.company_profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- ── Part C: promo_codes + redemptions ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                      TEXT NOT NULL UNIQUE,
  description               TEXT,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  expires_at                TIMESTAMPTZ,
  max_uses                  INTEGER,
  uses_count                INTEGER NOT NULL DEFAULT 0,
  membership_plan_id        UUID REFERENCES public.membership_plans(id),
  free_days                 INTEGER NOT NULL DEFAULT 0,
  percent_discount          NUMERIC(5,2),
  fixed_discount_pence      INTEGER,
  region                    TEXT,
  new_users_only            BOOLEAN NOT NULL DEFAULT false,
  existing_members_allowed  BOOLEAN NOT NULL DEFAULT true,
  created_by                UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (max_uses IS NULL OR max_uses > 0),
  CHECK (free_days >= 0)
);

-- company_id references company_profiles(id) — the surrogate PK used by every
-- other FK in this codebase (jobs.confirmed_tradesperson_id, saved_traders,
-- company_activity_log, etc.), NOT company_profiles(user_id).
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id      UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  company_id         UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  free_days_granted  INTEGER NOT NULL DEFAULT 0,
  redeemed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_company ON public.promo_code_redemptions (company_id);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
-- No public policies: promo_codes/redemptions are only readable/writable via
-- SECURITY DEFINER functions (redeem_promo_code) or the service role (admin API routes).

-- ── Part D: referrals ────────────────────────────────────────────────────────

-- referrer_company_id / referred_company_id reference company_profiles(id),
-- same surrogate-PK convention as promo_code_redemptions above.
CREATE TABLE IF NOT EXISTS public.referrals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_company_id   UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  referred_company_id   UUID NOT NULL UNIQUE REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  referral_code         TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  referrer_reward_days  INTEGER,
  referred_reward_days  INTEGER,
  referrer_rewarded_at  TIMESTAMPTZ,
  referred_rewarded_at  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (referrer_company_id <> referred_company_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_company_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- referrer_company_id/referred_company_id are company_profiles.id values, not
-- auth uids, so ownership is resolved via a subquery against the caller's own
-- company_profiles row rather than a direct auth.uid() comparison.
DROP POLICY IF EXISTS referrals_select_own ON public.referrals;
CREATE POLICY referrals_select_own ON public.referrals
  FOR SELECT USING (
    referrer_company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid())
    OR referred_company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid())
  );

-- ── Part E: admin_settings — referral programme config ─────────────────────

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS referral_program_enabled      BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS referral_reward_days_referrer INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS referral_reward_days_referred INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS first_job_reward_days         INTEGER DEFAULT 30;

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
    'first_job_reward_days',                 COALESCE(first_job_reward_days, 30)
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
      'first_job_reward_days', 30
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
    'first_job_reward_days',                 COALESCE(first_job_reward_days, 30)
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
      'first_job_reward_days', 30
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
    updated_at                            = NOW();

  result := json_build_object('success', true);
  RETURN result;
END;
$$;

-- ── Part F: grant_membership_bonus_days — stacking helper ──────────────────
-- Extends free_active_until from whichever is later (now, or the existing
-- expiry) so promo/referral/reward grants stack rather than overwrite.
-- p_company_id is company_profiles.id (the surrogate PK used for every FK in
-- this codebase — jobs.confirmed_tradesperson_id, etc.), NOT the auth user id.

CREATE OR REPLACE FUNCTION public.grant_membership_bonus_days(p_company_id UUID, p_days INTEGER)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_until TIMESTAMPTZ;
BEGIN
  IF p_days IS NULL OR p_days <= 0 THEN
    SELECT free_active_until INTO v_new_until FROM public.company_profiles WHERE id = p_company_id;
    RETURN v_new_until;
  END IF;

  UPDATE public.company_profiles
  SET free_active_until = GREATEST(COALESCE(free_active_until, now()), now()) + (p_days || ' days')::interval
  WHERE id = p_company_id
  RETURNING free_active_until INTO v_new_until;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company profile % not found', p_company_id;
  END IF;

  RETURN v_new_until;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_membership_bonus_days(UUID, INTEGER) TO service_role;

-- ── Part F2: grant_first_job_reward_if_due — shared by every completion path ──
-- Jobs can be marked COMPLETED from three call sites in this app (the
-- complete_job() RPC, and two API routes that update jobs.status directly).
-- This is the single source of truth for "was this this tradesperson's first
-- completed job — if so, end their trial and grant the reward", callable from
-- all three. Takes company_profiles.id (== jobs.confirmed_tradesperson_id).
CREATE OR REPLACE FUNCTION public.grant_first_job_reward_if_due(p_tradesperson_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_completed BOOLEAN;
  v_reward_days        INTEGER;
  v_new_until           TIMESTAMPTZ;
BEGIN
  IF p_tradesperson_company_id IS NULL THEN
    RETURN json_build_object('success', true, 'rewarded', false, 'reason', 'no_tradesperson');
  END IF;

  SELECT first_job_completed_at IS NOT NULL INTO v_already_completed
  FROM public.company_profiles WHERE id = p_tradesperson_company_id;

  -- NULL (no matching row) behaves like "already completed": nothing to do.
  IF v_already_completed IS NOT FALSE THEN
    RETURN json_build_object('success', true, 'rewarded', false, 'reason', 'not_first_job_or_no_profile');
  END IF;

  SELECT COALESCE(first_job_reward_days, 30) INTO v_reward_days FROM public.admin_settings LIMIT 1;

  UPDATE public.company_profiles
  SET first_job_completed_at = now()
  WHERE id = p_tradesperson_company_id;

  v_new_until := public.grant_membership_bonus_days(p_tradesperson_company_id, v_reward_days);

  RETURN json_build_object('success', true, 'rewarded', true, 'reward_days', v_reward_days, 'free_active_until', v_new_until);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_first_job_reward_if_due(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_first_job_reward_if_due(UUID) TO service_role;

-- ── Part G: get_company_membership_status — computed status ────────────────

CREATE OR REPLACE FUNCTION public.get_company_membership_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subs_enabled BOOLEAN;
  v_company      RECORD;
  v_plan         JSON;
  v_status       TEXT;
BEGIN
  SELECT COALESCE(subscriptions_enabled, false) INTO v_subs_enabled FROM public.admin_settings LIMIT 1;

  SELECT * INTO v_company FROM public.company_profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company profile % not found', p_user_id;
  END IF;

  IF NOT v_subs_enabled THEN
    v_status := 'platform_free';
  ELSIF v_company.free_active_until IS NOT NULL AND v_company.free_active_until > now() THEN
    v_status := CASE WHEN v_company.first_job_completed_at IS NULL THEN 'trial_bonus' ELSE 'reward' END;
  ELSIF v_company.first_job_completed_at IS NULL THEN
    v_status := 'trial';
  ELSIF v_company.membership_plan_id IS NOT NULL THEN
    v_status := 'active_paid';
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
    'subscriptions_enabled',       v_subs_enabled,
    'first_job_completed_at',      v_company.first_job_completed_at,
    'free_active_until',           v_company.free_active_until,
    'membership_plan',             v_plan,
    'membership_plan_selected_at', v_company.membership_plan_selected_at,
    'referral_code',               v_company.referral_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_membership_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_membership_status(UUID) TO service_role;

-- ── Part H: redeem_promo_code ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_user_id UUID, p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo    RECORD;
  v_company  RECORD;
  v_new_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_company FROM public.company_profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Company profile not found');
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes WHERE upper(code) = upper(p_code) FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid promo code');
  END IF;

  IF NOT v_promo.is_active THEN
    RETURN json_build_object('success', false, 'error', 'This promo code is no longer active');
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'This promo code has expired');
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.uses_count >= v_promo.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'This promo code has reached its usage limit');
  END IF;

  IF EXISTS (SELECT 1 FROM public.promo_code_redemptions WHERE promo_code_id = v_promo.id AND company_id = v_company.id) THEN
    RETURN json_build_object('success', false, 'error', 'You have already redeemed this promo code');
  END IF;

  IF v_promo.new_users_only AND v_company.first_job_completed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'This promo code is only available to new members');
  END IF;

  IF NOT v_promo.existing_members_allowed AND v_company.membership_plan_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'This promo code is not available to existing members');
  END IF;

  IF v_promo.region IS NOT NULL AND (v_company.location IS NULL OR v_company.location NOT ILIKE '%' || v_promo.region || '%') THEN
    RETURN json_build_object('success', false, 'error', 'This promo code is not available in your region');
  END IF;

  IF v_promo.free_days > 0 THEN
    v_new_until := public.grant_membership_bonus_days(v_company.id, v_promo.free_days);
  ELSE
    v_new_until := v_company.free_active_until;
  END IF;

  IF v_promo.membership_plan_id IS NOT NULL THEN
    UPDATE public.company_profiles
    SET membership_plan_id = v_promo.membership_plan_id
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.promo_code_redemptions (promo_code_id, company_id, free_days_granted)
  VALUES (v_promo.id, v_company.id, v_promo.free_days);

  UPDATE public.promo_codes SET uses_count = uses_count + 1, updated_at = now() WHERE id = v_promo.id;

  RETURN json_build_object(
    'success', true,
    'free_days_granted', v_promo.free_days,
    'free_active_until', v_new_until
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_promo_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(UUID, TEXT) TO service_role;

-- ── Part I: apply_referral — record a pending referral at signup ───────────

CREATE OR REPLACE FUNCTION public.apply_referral(p_referred_user_id UUID, p_referral_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id      UUID; -- company_profiles.id of the referrer
  v_referrer_user_id UUID; -- auth uid of the referrer, for the self-referral check
  v_referred_id      UUID; -- company_profiles.id of the referred (new) company
BEGIN
  SELECT id, user_id INTO v_referrer_id, v_referrer_user_id
  FROM public.company_profiles WHERE referral_code = upper(p_referral_code);
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referrer_user_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Self-referral is not allowed');
  END IF;

  SELECT id INTO v_referred_id FROM public.company_profiles WHERE user_id = p_referred_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Company profile not found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_company_id = v_referred_id) THEN
    RETURN json_build_object('success', false, 'error', 'This account has already been referred');
  END IF;

  INSERT INTO public.referrals (referrer_company_id, referred_company_id, referral_code)
  VALUES (v_referrer_id, v_referred_id, upper(p_referral_code));

  UPDATE public.company_profiles SET referred_by_code = upper(p_referral_code) WHERE user_id = p_referred_user_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral(UUID, TEXT) TO service_role;

-- ── Part J: complete_referral_reward — grants both-side reward once ────────
-- Called when the referred tradesperson completes their profile. Gated by
-- referral_program_enabled: when off, the pending referral is marked
-- completed with zero reward days so it can never be double-processed later,
-- but the link itself still worked (row exists, referred_by_code was captured).

CREATE OR REPLACE FUNCTION public.complete_referral_reward(p_referred_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_id   UUID; -- company_profiles.id of the referred (new) company
  v_referral      RECORD;
  v_enabled       BOOLEAN;
  v_days_referrer INTEGER;
  v_days_referred INTEGER;
BEGIN
  SELECT id INTO v_referred_id FROM public.company_profiles WHERE user_id = p_referred_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Company profile not found');
  END IF;

  SELECT * INTO v_referral FROM public.referrals
  WHERE referred_company_id = v_referred_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No pending referral for this account');
  END IF;

  SELECT COALESCE(referral_program_enabled, true),
         COALESCE(referral_reward_days_referrer, 30),
         COALESCE(referral_reward_days_referred, 30)
  INTO v_enabled, v_days_referrer, v_days_referred
  FROM public.admin_settings LIMIT 1;

  IF NOT v_enabled THEN
    UPDATE public.referrals
    SET status = 'completed', referrer_reward_days = 0, referred_reward_days = 0
    WHERE id = v_referral.id;
    RETURN json_build_object('success', true, 'rewarded', false, 'reason', 'referral_program_disabled');
  END IF;

  PERFORM public.grant_membership_bonus_days(v_referral.referrer_company_id, v_days_referrer);
  PERFORM public.grant_membership_bonus_days(v_referral.referred_company_id, v_days_referred);

  UPDATE public.referrals
  SET status = 'completed',
      referrer_reward_days = v_days_referrer,
      referred_reward_days = v_days_referred,
      referrer_rewarded_at = now(),
      referred_rewarded_at = now()
  WHERE id = v_referral.id;

  RETURN json_build_object('success', true, 'rewarded', true, 'referrer_days', v_days_referrer, 'referred_days', v_days_referred);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_referral_reward(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_referral_reward(UUID) TO service_role;

-- ── Verification ─────────────────────────────────────────────────────────

DO $$
DECLARE
  v_plans_count INTEGER;
  v_col_check   BOOLEAN;
BEGIN
  SELECT count(*) INTO v_plans_count FROM public.membership_plans;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'free_active_until'
  ) INTO v_col_check;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'membership_plans seeded rows : %', v_plans_count;
  RAISE NOTICE 'company_profiles.free_active_until : %', CASE WHEN v_col_check THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE '✅ Migration 20260715000001 (membership/promo/referral schema) complete';
END;
$$;
