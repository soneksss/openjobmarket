-- ============================================================
-- Add "Plastering & Rendering" as a standalone trade industry.
-- Previously "Plasterer" was nested under "Construction & Renovation".
-- ============================================================

-- 1. Migrate company profiles whose industry already signals plastering/rendering
--    (catches any that were set via free-text entry or old backfill)
UPDATE public.company_profiles
SET industry = 'Plastering & Rendering'
WHERE (
  industry ILIKE '%plastering%'
  OR industry ILIKE '%rendering%'
  OR industry = 'Plasterer'
)
AND industry != 'Plastering & Rendering';

-- 2. Migrate profiles still sitting in "Construction & Renovation" whose
--    primary service is "Plasterer" or "Rendering Specialist"
UPDATE public.company_profiles
SET industry = 'Plastering & Rendering'
WHERE industry = 'Construction & Renovation'
  AND services IS NOT NULL
  AND (
    'Plasterer'           = ANY(services)
    OR 'Rendering Specialist' = ANY(services)
    OR 'Dry Lining'           = ANY(services)
    OR 'Skimming'             = ANY(services)
  )
  -- Only migrate if plastering is clearly the primary trade
  -- (i.e. the first service listed is one of the plastering services)
  AND (
    services[1] IN ('Plasterer', 'Rendering Specialist', 'Dry Lining', 'Skimming', 'Coving Specialist')
  );

-- 3. Backfill standardization: any remaining free-text plastering industry values
UPDATE public.company_profiles
SET industry = 'Plastering & Rendering'
WHERE industry ILIKE '%plaster%'
  AND industry != 'Plastering & Rendering';

DO $$ BEGIN
  RAISE NOTICE '✓ Plastering & Rendering added as standalone trade industry';
  RAISE NOTICE '✓ Existing company_profiles migrated where applicable';
END $$;
