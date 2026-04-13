-- Allow anyone (including anon/homeowners) to read portfolio photos.
-- Writes remain owner-only (handled by existing policies or the API routes).

ALTER TABLE IF EXISTS trades_portfolio_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing select policy if any, then recreate
DROP POLICY IF EXISTS "portfolio_photos_public_read" ON trades_portfolio_photos;

CREATE POLICY "portfolio_photos_public_read"
  ON trades_portfolio_photos
  FOR SELECT
  USING (true);

-- Owner can insert/update/delete their own photos
DROP POLICY IF EXISTS "portfolio_photos_owner_write" ON trades_portfolio_photos;

CREATE POLICY "portfolio_photos_owner_write"
  ON trades_portfolio_photos
  FOR ALL
  USING (
    tradesperson_id IN (
      SELECT id FROM company_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tradesperson_id IN (
      SELECT id FROM company_profiles WHERE user_id = auth.uid()
    )
  );
