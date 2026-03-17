-- ============================================================================
-- Migration: Add industry + service columns to jobs table
-- Date: 2026-03-16
-- Purpose: Enable 2-level industry/service matching between homeowner job posts
--          and tradesperson profiles (company_profiles.industry + services[]).
-- ============================================================================

-- Add columns (idempotent)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS service  text;

-- Backfill industry from existing category values
-- These map old short category names → full industry titles used in company_profiles
UPDATE jobs
SET industry = CASE
  WHEN category = 'Plumbing'            THEN 'Plumbing & Heating'
  WHEN category = 'Electrical'          THEN 'Electrical & Electronic Engineering'
  WHEN category = 'Construction'        THEN 'Construction & Renovation'
  WHEN category = 'Carpentry'           THEN 'Construction & Renovation'
  WHEN category = 'Painting & Decorating' THEN 'Construction & Renovation'
  WHEN category = 'Roofing'             THEN 'Construction & Renovation'
  WHEN category = 'Flooring'            THEN 'Construction & Renovation'
  WHEN category = 'Gardening'           THEN 'Gardening & Landscaping'
  WHEN category = 'Cleaning'            THEN 'Cleaning & Maintenance'
  WHEN category = 'General Handyman'    THEN 'Cleaning & Maintenance'
  ELSE NULL
END
WHERE industry IS NULL
  AND category IS NOT NULL;

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_jobs_industry ON jobs (industry);
CREATE INDEX IF NOT EXISTS idx_jobs_service  ON jobs (service);

-- Verify
SELECT
  COALESCE(industry, '(null)') AS industry,
  COUNT(*) AS job_count
FROM jobs
WHERE is_tradespeople_job = true
GROUP BY industry
ORDER BY job_count DESC;
