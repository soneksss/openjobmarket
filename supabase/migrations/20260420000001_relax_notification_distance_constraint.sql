-- Replace the fixed-values constraint (5/10/15/20) with a 1–20 mile range.
-- Max 20 miles: app targets local trades only.
ALTER TABLE company_profiles
  DROP CONSTRAINT IF EXISTS check_trade_notifications_distance;

ALTER TABLE company_profiles
  ADD CONSTRAINT check_trade_notifications_distance
  CHECK (trade_job_notifications_distance IS NULL OR (trade_job_notifications_distance >= 1 AND trade_job_notifications_distance <= 20));
