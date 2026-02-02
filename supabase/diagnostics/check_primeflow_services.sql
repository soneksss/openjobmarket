-- Quick check: What services does PRIMEFLOW have?
SELECT
  company_name,
  services,
  trade_job_notifications,
  trade_job_notifications_distance
FROM company_profiles
WHERE company_name ILIKE '%primeflow%';

-- And what was the job title?
SELECT
  j.title,
  j.location,
  cp.company_name as poster
FROM jobs j
LEFT JOIN company_profiles cp ON cp.id = j.company_id
WHERE (cp.company_name ILIKE '%remus%' OR j.location ILIKE '%weybridge%')
  AND j.is_tradespeople_job = true
ORDER BY j.created_at DESC
LIMIT 1;

-- Manual matching test
WITH job_data AS (
  SELECT lower(j.title) as job_skill
  FROM jobs j
  LEFT JOIN company_profiles cp ON cp.id = j.company_id
  WHERE (cp.company_name ILIKE '%remus%' OR j.location ILIKE '%weybridge%')
    AND j.is_tradespeople_job = true
  ORDER BY j.created_at DESC
  LIMIT 1
),
primeflow AS (
  SELECT services FROM company_profiles WHERE company_name ILIKE '%primeflow%'
)
SELECT
  jd.job_skill,
  p.services,
  EXISTS (
    SELECT 1
    FROM unnest(p.services) AS svc
    WHERE lower(svc) LIKE '%' || jd.job_skill || '%'
       OR jd.job_skill LIKE '%' || lower(svc) || '%'
  ) as services_match
FROM job_data jd, primeflow p;
