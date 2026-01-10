-- Check if Trade Job specific columns exist in jobs table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'jobs'
  AND column_name IN ('category', 'urgency', 'budget_min', 'budget_max', 'job_type')
ORDER BY column_name;

-- Also check what columns DO exist in jobs table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'jobs'
ORDER BY column_name;
