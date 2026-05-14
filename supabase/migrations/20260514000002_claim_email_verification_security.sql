-- Security: claim_seeded_business enforces:
--   1. Caller must be a fully authenticated session (uid + email both present)
--   2. Caller's JWT email must match the seeded trade's email (case-insensitive)
--   3. On success, user role is auto-promoted to 'company' so no manual role choice is needed

CREATE OR REPLACE FUNCTION public.claim_seeded_business(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade        seeded_trades%ROWTYPE;
  v_cp_id        uuid;
  v_user_email   text;
BEGIN

  -- Guard 1: session must have a real uid (no anon / service-role edge-cases)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Guard 2: JWT must carry a verified email (OTP flow guarantees this, but be explicit)
  v_user_email := auth.jwt()->>'email';
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'email_not_verified';
  END IF;

  -- Lock row; raise if token is invalid or already claimed
  SELECT *
  INTO v_trade
  FROM public.seeded_trades
  WHERE claim_token = p_token
    AND claimed     = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_claimed_token';
  END IF;

  -- Guard 3: business email must be set AND match the caller's email
  IF v_trade.email IS NULL OR lower(v_trade.email) <> lower(v_user_email) THEN
    RAISE EXCEPTION 'email_not_authorized_to_claim';
  END IF;

  -- Mark as claimed
  UPDATE public.seeded_trades
  SET claimed            = true,
      claimed_by_user_id = auth.uid()
  WHERE id = v_trade.id;

  -- Auto-promote user to 'company' role regardless of how they originally signed up
  -- (covers the case where someone hit OTP and landed as 'homeowner' by default)
  UPDATE public.users
  SET user_type = 'company'
  WHERE id = auth.uid()
    AND user_type IS DISTINCT FROM 'company';

  -- Create the company profile
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
  ) VALUES (
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
