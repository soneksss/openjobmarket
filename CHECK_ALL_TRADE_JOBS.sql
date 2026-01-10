-- Check ALL Trade Jobs (posted by homeowners OR companies)

-- Query 1: Count all Trade Jobs
SELECT
  'Total Trade Jobs' as check_type,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM jobs
WHERE is_tradespeople_job = true;

-- Query 2: Show all Trade Jobs with details
SELECT
  j.id,
  j.title,
  j.status,
  j.is_active,
  j.is_tradespeople_job,
  j.expires_at,
  j.created_at,
  j.latitude,
  j.longitude,
  j.location,
  j.category,
  j.urgency,
  j.budget_min,
  j.budget_max,
  j.homeowner_id,
  j.company_id,
  hp.first_name as homeowner_first_name,
  hp.last_name as homeowner_last_name,
  cp.company_name
FROM jobs j
LEFT JOIN homeowner_profiles hp ON j.homeowner_id = hp.id
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE j.is_tradespeople_job = true
ORDER BY j.created_at DESC;

-- Query 3: Check Remus company Trade Jobs specifically
SELECT
  j.id,
  j.title,
  j.status,
  j.is_active,
  j.expires_at,
  j.created_at,
  j.location,
  j.job_type,
  j.work_location,
  j.applications_count,
  j.views_count,
  cp.company_name
FROM jobs j
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE cp.company_name ILIKE '%remus%'
  AND j.is_tradespeople_job = true
ORDER BY j.created_at DESC;

-- Query 4: Check if the Trade Job from dashboard exists
-- Looking for: "Plumber", "1067 Garratt Lane", expires 07/02/2026
SELECT
  j.*,
  cp.company_name
FROM jobs j
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE j.is_tradespeople_job = true
  AND j.location ILIKE '%Garratt Lane%'
  AND j.expires_at::date = '2026-02-07'::date
ORDER BY j.created_at DESC;
