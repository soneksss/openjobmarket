-- Fix jobs.industry values to match TRADE_INDUSTRIES titles exactly.
-- The previous migration (20260316000003) used incorrect broad names.
-- This corrects them to match lib/data/trade-industries.ts.

UPDATE jobs
SET industry = CASE
  WHEN category = 'Plumbing'              THEN 'Plumbing & Heating'
  WHEN category = 'Electrical'            THEN 'Electrical'
  WHEN category = 'Construction'          THEN 'Construction & Renovation'
  WHEN category = 'Carpentry'             THEN 'Carpentry & Joinery'
  WHEN category = 'Painting & Decorating' THEN 'Painting & Decorating'
  WHEN category = 'Roofing'               THEN 'Roofing'
  WHEN category = 'Flooring'              THEN 'Flooring & Tiling'
  WHEN category = 'Gardening'             THEN 'Gardening & Landscaping'
  WHEN category = 'Cleaning'              THEN 'Cleaning'
  WHEN category = 'General Handyman'      THEN 'Handyman / Small Jobs'
  ELSE NULL
END
WHERE category IS NOT NULL;

-- Verify
SELECT
  COALESCE(industry, '(null)') AS industry,
  category,
  COUNT(*) AS job_count
FROM jobs
WHERE is_tradespeople_job = true
GROUP BY industry, category
ORDER BY job_count DESC;
