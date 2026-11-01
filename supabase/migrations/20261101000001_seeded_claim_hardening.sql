-- Seeded listing claim hardening. Applied manually in the Supabase SQL Editor on 2026-11-01.
--
-- Rollback, if something breaks:
--   GRANT SELECT ON public.seeded_trades TO anon, authenticated;
--   then re-run the claim_seeded_business definition from
--   20260514000005_claim_flow_email_lock.sql, which also restores its old behaviour.
--   The dropped update policy shouldn't be restored: claims don't use it.

BEGIN;

-- ── 1. No direct updates. Claims go through claim_seeded_business(), which is
--      SECURITY DEFINER and doesn't need this policy. Admin routes use the service role.
DROP POLICY IF EXISTS "seeded_trades_authenticated_claim" ON public.seeded_trades;

-- ── 2. The public key reads display columns only. RLS still limits rows to unclaimed.
REVOKE ALL ON public.seeded_trades FROM anon, authenticated;
GRANT SELECT (id, company_name, trade_category, normalised_categories, address, postcode,
              lat, lng, website, created_at, claimed)
  ON public.seeded_trades TO anon, authenticated;

-- ── 3. Claim guards. Body otherwise matches 20260514000005_claim_flow_email_lock.sql.
CREATE OR REPLACE FUNCTION public.claim_seeded_business(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade seeded_trades%ROWTYPE;
  v_cp_id uuid;
  v_user  auth.users%ROWTYPE;
BEGIN

  -- Guard 1: session must have a real uid
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Guard 2: the email must really be verified. Read from auth.users, not the JWT.
  -- Accounts created through the admin API are pre-confirmed without proving
  -- ownership, so they have no confirmation_sent_at unless they signed in by OAuth.
  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND
     OR v_user.email IS NULL
     OR v_user.email_confirmed_at IS NULL
     OR (v_user.confirmation_sent_at IS NULL
         AND COALESCE(v_user.raw_app_meta_data->>'provider', 'email') = 'email') THEN
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

  -- Guard 3: the listing must have an email, and it must match.
  -- A NULL email has to be rejected explicitly: NULL <> x is NULL, which skips the IF.
  IF v_trade.email IS NULL
     OR btrim(v_trade.email) = ''
     OR lower(btrim(v_trade.email)) <> lower(btrim(v_user.email)) THEN
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

REVOKE ALL ON FUNCTION public.claim_seeded_business(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_seeded_business(uuid) TO authenticated;

-- ── 4. search_traders() is callable with the public key and returns every claim token.
--      Nothing in the app reads that column. Patch the deployed definition rather than
--      re-pasting it, so nothing else about the function changes.
DO $$
DECLARE
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_old
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'search_traders';

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'search_traders: function not found';
  END IF;

  v_new := replace(v_old, 'st.claim_token', 'NULL::uuid AS claim_token');
  IF v_new <> v_old THEN
    EXECUTE v_new;
  END IF;
END;
$$;

COMMIT;
