-- ============================================================
-- Seeded trades additions:
--   1. website column
--   2. claim_url generated column
--   3. seeded_trades_email_export view
--   4. Updated claim_seeded_business (copies website_url)
-- ============================================================

-- 1. Website URL for the business
ALTER TABLE public.seeded_trades
  ADD COLUMN IF NOT EXISTS website text;

-- 2. claim_url — auto-computed from claim_token, always in sync
ALTER TABLE public.seeded_trades
  ADD COLUMN IF NOT EXISTS claim_url text
    GENERATED ALWAYS AS ('https://openjobmarket.com/claim/' || claim_token::text) STORED;

-- 3. Email export view — used by admin for campaign outreach
CREATE OR REPLACE VIEW public.seeded_trades_email_export AS
SELECT
  company_name,
  email,
  trade_category,
  claim_url
FROM public.seeded_trades
WHERE claimed  = false
  AND email IS NOT NULL;

-- 4. Refresh claim_seeded_business to also copy website_url
CREATE OR REPLACE FUNCTION public.claim_seeded_business(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade seeded_trades%ROWTYPE;
  v_cp_id uuid;
BEGIN
  -- Lock row; raise if token is invalid or already claimed
  SELECT * INTO v_trade
  FROM public.seeded_trades
  WHERE claim_token = p_token
    AND claimed     = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_claimed_token';
  END IF;

  -- Mark as claimed
  UPDATE public.seeded_trades
  SET claimed            = true,
      claimed_by_user_id = auth.uid()
  WHERE id = v_trade.id;

  -- Create the real company profile (now includes website_url)
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

DO $$ BEGIN
  RAISE NOTICE '✓ seeded_trades: website + claim_url columns added, email export view created, RPC updated';
END $$;
