-- ============================================================
-- Test seed: General Electrical Ltd — used to verify the
-- seeded-company claim flow end-to-end.
-- Email matches openjobmarket@outlook.com so the owner can
-- claim it via OTP at /claim/<token>.
-- ============================================================

INSERT INTO public.seeded_trades
  (company_name, trade_category, address, postcode, lat, lng, email, phone, website, source)
VALUES
(
  'General Electrical Ltd',
  'Electrical & Electronic Engineering',
  '12 East St, Havant',
  'PO9 1AA',
  50.8527, -0.9815,
  'openjobmarket@outlook.com',
  '+44 23 9200 1234',
  NULL,
  'manual_test'
);
