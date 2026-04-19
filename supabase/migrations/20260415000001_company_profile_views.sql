-- Migration: Company profile view tracking
CREATE TABLE IF NOT EXISTS company_profile_views (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  viewed_at      TIMESTAMPTZ NOT NULL    DEFAULT now(),
  viewer_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_company_profile_views_company ON company_profile_views(company_id, viewed_at DESC);
ALTER TABLE company_profile_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_read_own_views" ON company_profile_views FOR SELECT USING (EXISTS (SELECT 1 FROM company_profiles WHERE id = company_id AND user_id = auth.uid()));
CREATE POLICY "insert_profile_view" ON company_profile_views FOR INSERT WITH CHECK (true);
