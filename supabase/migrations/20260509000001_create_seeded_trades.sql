-- ============================================================
-- Create seeded_trades table for unclaimed business listings
-- imported from Google Maps / CSV data
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seeded_trades (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name       text    NOT NULL,
  trade_category     text,
  email              text,
  phone              text,
  address            text,
  postcode           text,
  lat                double precision,
  lng                double precision,
  source             text    DEFAULT 'google_maps',
  claimed            boolean DEFAULT false,
  claimed_by_user_id uuid    REFERENCES auth.users(id),
  claim_token        uuid    DEFAULT gen_random_uuid(),
  created_at         timestamptz DEFAULT now()
);

-- Unique constraint so the seed script is idempotent
ALTER TABLE public.seeded_trades
  ADD CONSTRAINT uq_seeded_trades_name_postcode UNIQUE (company_name, postcode);

CREATE INDEX IF NOT EXISTS idx_seeded_trades_postcode    ON public.seeded_trades (postcode);
CREATE INDEX IF NOT EXISTS idx_seeded_trades_latlng      ON public.seeded_trades (lat, lng);
CREATE INDEX IF NOT EXISTS idx_seeded_trades_claimed     ON public.seeded_trades (claimed);
CREATE INDEX IF NOT EXISTS idx_seeded_trades_claim_token ON public.seeded_trades (claim_token);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.seeded_trades ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read unclaimed listings
CREATE POLICY "seeded_trades_public_select"
  ON public.seeded_trades FOR SELECT
  USING (claimed = false);

-- Authenticated users can claim a row (set claimed=true + their user_id)
CREATE POLICY "seeded_trades_authenticated_claim"
  ON public.seeded_trades FOR UPDATE
  TO authenticated
  USING (claimed = false)
  WITH CHECK (
    claimed = true
    AND claimed_by_user_id = auth.uid()
  );

-- ── Helper function: claim_seeded_business ────────────────────
-- Atomically marks the listing as claimed and creates a real
-- company_profile for the authenticated user.
-- Returns the new company_profile id.
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
  -- Lock the row; error if token is invalid or already claimed
  SELECT * INTO v_trade
  FROM public.seeded_trades
  WHERE claim_token = p_token
    AND claimed     = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_claimed_token';
  END IF;

  -- Mark as claimed by the current user
  UPDATE public.seeded_trades
  SET claimed            = true,
      claimed_by_user_id = auth.uid()
  WHERE id = v_trade.id;

  -- Create the real company profile
  INSERT INTO public.company_profiles (
    user_id,
    company_name,
    industry,
    location,
    latitude,
    longitude,
    phone_number,
    contact_email
  ) VALUES (
    auth.uid(),
    v_trade.company_name,
    v_trade.trade_category,
    COALESCE(v_trade.address, v_trade.postcode),
    v_trade.lat,
    v_trade.lng,
    v_trade.phone,
    v_trade.email
  )
  RETURNING id INTO v_cp_id;

  RETURN v_cp_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_seeded_business TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ seeded_trades table created with RLS + claim_seeded_business function';
END $$;
