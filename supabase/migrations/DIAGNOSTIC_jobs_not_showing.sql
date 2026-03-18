-- ============================================================
-- FIX 1: Extend all expired trade jobs by 30 days
-- (test jobs created weeks ago all have stale expires_at)
-- ============================================================

UPDATE public.jobs
SET
  expires_at = NOW() + INTERVAL '30 days',
  is_active  = true,
  status     = 'POSTED'
WHERE is_tradespeople_job = true
  AND status IN ('POSTED', 'CONFIRMED')
  AND expires_at < NOW();

-- Verify: should now be 32+ jobs passing all filters
SELECT
  COUNT(*)                                                      AS total,
  COUNT(*) FILTER (WHERE expires_at > NOW())                   AS not_expired_after_fix,
  COUNT(*) FILTER (
    WHERE is_active = true
      AND status    = 'POSTED'
      AND (expires_at IS NULL OR expires_at > NOW())
  )                                                             AS pass_all_filters
FROM public.jobs
WHERE is_tradespeople_job = true;


-- ============================================================
-- DIAGNOSTIC 2: What industries are on the 5 (now 32) jobs?
-- Compare against the tradesperson's profile industry.
-- ============================================================

SELECT
  COALESCE(industry, '(null)') AS industry,
  COUNT(*)                      AS job_count
FROM public.jobs
WHERE is_tradespeople_job = true
  AND status    = 'POSTED'
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
GROUP BY industry
ORDER BY job_count DESC;
