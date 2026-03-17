-- ============================================================================
-- Migration: Backfill jobs.category from jobs.title
-- Date: 2026-03-16
-- Purpose: All existing tradespeople jobs have category = NULL because the
--          job wizard only saved to title. This backfills category using the
--          same profession → category mapping now used by the wizard.
-- ============================================================================

UPDATE jobs
SET category = CASE
  -- Plumbing
  WHEN title ILIKE '%plumber%'           THEN 'Plumbing'
  WHEN title ILIKE '%plumbing%'          THEN 'Plumbing'
  WHEN title ILIKE '%bathroom%'          THEN 'Plumbing'
  WHEN title ILIKE '%encanador%'         THEN 'Plumbing'

  -- Electrical
  WHEN title ILIKE '%electrician%'       THEN 'Electrical'
  WHEN title ILIKE '%electrical%'        THEN 'Electrical'
  WHEN title ILIKE '%heating%'           THEN 'Electrical'
  WHEN title ILIKE '%gas boiler%'        THEN 'Electrical'
  WHEN title ILIKE '%gas engineer%'      THEN 'Electrical'
  WHEN title ILIKE '%hvac%'              THEN 'Electrical'
  WHEN title ILIKE '%eletricista%'       THEN 'Electrical'
  WHEN title ILIKE '%aquecimento%'       THEN 'Electrical'

  -- Carpentry
  WHEN title ILIKE '%carpenter%'         THEN 'Carpentry'
  WHEN title ILIKE '%carpentry%'         THEN 'Carpentry'
  WHEN title ILIKE '%fencing%'           THEN 'Carpentry'
  WHEN title ILIKE '%window fitter%'     THEN 'Carpentry'
  WHEN title ILIKE '%door fitter%'       THEN 'Carpentry'
  WHEN title ILIKE '%windows/doors%'     THEN 'Carpentry'
  WHEN title ILIKE '%kitchen fitter%'    THEN 'Carpentry'
  WHEN title ILIKE '%carpinteiro%'       THEN 'Carpentry'
  WHEN title ILIKE '%cercas%'            THEN 'Carpentry'

  -- Painting & Decorating
  WHEN title ILIKE '%painter%'           THEN 'Painting & Decorating'
  WHEN title ILIKE '%decorator%'         THEN 'Painting & Decorating'
  WHEN title ILIKE '%painting%'          THEN 'Painting & Decorating'
  WHEN title ILIKE '%decorating%'        THEN 'Painting & Decorating'
  WHEN title ILIKE '%pintor%'            THEN 'Painting & Decorating'
  WHEN title ILIKE '%decorador%'         THEN 'Painting & Decorating'

  -- Roofing
  WHEN title ILIKE '%roofer%'            THEN 'Roofing'
  WHEN title ILIKE '%roofing%'           THEN 'Roofing'
  WHEN title ILIKE '%telhador%'          THEN 'Roofing'

  -- Gardening
  WHEN title ILIKE '%garden%'            THEN 'Gardening'
  WHEN title ILIKE '%tree surgeon%'      THEN 'Gardening'
  WHEN title ILIKE '%landscap%'          THEN 'Gardening'
  WHEN title ILIKE '%jardineiro%'        THEN 'Gardening'
  WHEN title ILIKE '%cirurgião de árvore%' THEN 'Gardening'

  -- Cleaning
  WHEN title ILIKE '%cleaner%'           THEN 'Cleaning'
  WHEN title ILIKE '%cleaning%'          THEN 'Cleaning'
  WHEN title ILIKE '%faxineiro%'         THEN 'Cleaning'

  -- Flooring
  WHEN title ILIKE '%flooring%'          THEN 'Flooring'
  WHEN title ILIKE '%tiler%'             THEN 'Flooring'
  WHEN title ILIKE '%tiling%'            THEN 'Flooring'
  WHEN title ILIKE '%azulejista%'        THEN 'Flooring'
  WHEN title ILIKE '%pisos%'             THEN 'Flooring'

  -- Construction
  WHEN title ILIKE '%builder%'           THEN 'Construction'
  WHEN title ILIKE '%construction%'      THEN 'Construction'
  WHEN title ILIKE '%bricklayer%'        THEN 'Construction'
  WHEN title ILIKE '%scaffolder%'        THEN 'Construction'
  WHEN title ILIKE '%plasterer%'         THEN 'Construction'
  WHEN title ILIKE '%welder%'            THEN 'Construction'
  WHEN title ILIKE '%glazier%'           THEN 'Construction'
  WHEN title ILIKE '%driveway%'          THEN 'Construction'
  WHEN title ILIKE '%construtor%'        THEN 'Construction'
  WHEN title ILIKE '%pedreiro%'          THEN 'Construction'
  WHEN title ILIKE '%gesseiro%'          THEN 'Construction'
  WHEN title ILIKE '%andaimeiro%'        THEN 'Construction'
  WHEN title ILIKE '%soldador%'          THEN 'Construction'

  -- General Handyman (catch-all for handyman/locksmith/mechanic)
  WHEN title ILIKE '%handyman%'          THEN 'General Handyman'
  WHEN title ILIKE '%locksmith%'         THEN 'General Handyman'
  WHEN title ILIKE '%mechanic%'          THEN 'General Handyman'
  WHEN title ILIKE '%faz-tudo%'          THEN 'General Handyman'
  WHEN title ILIKE '%chaveiro%'          THEN 'General Handyman'
  WHEN title ILIKE '%mecânico%'          THEN 'General Handyman'

  ELSE NULL  -- leave unmapped titles as null rather than guessing
END
WHERE is_tradespeople_job = true
  AND category IS NULL;

-- Verify
SELECT
  COALESCE(category, '(still null)') AS category,
  COUNT(*) AS job_count
FROM jobs
WHERE is_tradespeople_job = true
GROUP BY category
ORDER BY job_count DESC;
