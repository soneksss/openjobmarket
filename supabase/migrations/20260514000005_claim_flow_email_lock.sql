-- ============================================================
-- Migration: claim_flow_email_lock
-- Purpose:
--   1. Prevent claiming business with wrong email
--   2. Lock company name/email to seeded data
--   3. Ensure DB enforces ownership
-- ============================================================


-- 1. Email enforcement is handled at the RPC level (see claim_seeded_business below).
-- A NOT NULL constraint cannot be applied here because legacy CSV imports contain
-- rows where the business email was not publicly available. Those listings simply
-- cannot be claimed until an admin adds the email manually.


-- 2. Prevent editing company name or contact email after claim
-- (these must always come from seeded listing)

CREATE OR REPLACE FUNCTION public.prevent_claim_field_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.company_name <> OLD.company_name THEN
      RAISE EXCEPTION 'company_name_locked';
    END IF;

    IF NEW.contact_email <> OLD.contact_email THEN
      RAISE EXCEPTION 'contact_email_locked';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_claim_fields ON public.company_profiles;

CREATE TRIGGER lock_claim_fields
BEFORE UPDATE ON public.company_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_claim_field_edit();


-- 3. Harden claim_seeded_business further
-- Require authenticated email match BEFORE claim

CREATE OR REPLACE FUNCTION public.claim_seeded_business(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade seeded_trades%ROWTYPE;
  v_cp_id uuid;
  v_user_email text;
BEGIN

  -- Guard 1: session must have a real uid
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Guard 2: JWT must carry a verified email
  v_user_email := auth.jwt()->>'email';
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'email_not_verified';
  END IF;

  -- Lock row; raise if token is invalid or already claimed
  SELECT *
  INTO v_trade
  FROM public.seeded_trades
  WHERE claim_token = p_token
    AND claimed = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_claimed_token';
  END IF;

  -- Guard 3: email must match
  IF lower(v_trade.email) <> lower(v_user_email) THEN
    RAISE EXCEPTION 'email_not_authorized_to_claim';
  END IF;

  -- Mark listing claimed
  UPDATE public.seeded_trades
  SET claimed            = true,
      claimed_by_user_id = auth.uid()
  WHERE id = v_trade.id;

  -- Auto-promote user to 'company' role
  UPDATE public.users
  SET user_type = 'company'
  WHERE id = auth.uid()
    AND user_type IS DISTINCT FROM 'company';

  -- Create company profile using seeded data ONLY
  INSERT INTO public.company_profiles (
    user_id,
    company_name,
    industry,
    location,
    latitude,
    longitude,
    phone_number,
    contact_email,
    website_url
  )
  VALUES (
    auth.uid(),
    v_trade.company_name,
    v_trade.trade_category,
    COALESCE(v_trade.address, v_trade.postcode),
    v_trade.lat,
    v_trade.lng,
    v_trade.phone,
    v_trade.email,
    v_trade.website
  )
  RETURNING id INTO v_cp_id;

  RETURN v_cp_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_seeded_business TO authenticated;
