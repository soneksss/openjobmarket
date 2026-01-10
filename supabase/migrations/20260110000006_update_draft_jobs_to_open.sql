-- Update existing draft vacancies to 'open' status
-- This fixes the issue where vacancies were created with status = 'draft'
-- and therefore didn't appear in search results (which filters for status = 'open')

UPDATE jobs
SET
  status = 'open',
  updated_at = NOW()
WHERE status = 'draft'
  AND is_tradespeople_job = FALSE
  AND is_active = TRUE;

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM jobs
  WHERE status = 'open'
    AND is_tradespeople_job = FALSE
    AND is_active = TRUE;

  RAISE NOTICE 'Updated draft jobs to open status. Total active vacancies: %', updated_count;
END $$;
