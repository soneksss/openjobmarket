-- Check current job data for user soneksss@yahoo.com
-- First, find the company profile ID
SELECT
    cp.id as company_id,
    cp.company_name,
    u.email
FROM company_profiles cp
JOIN auth.users u ON cp.user_id = u.id
WHERE u.email = 'soneksss@yahoo.com';

-- Check the actual jobs data to see is_tradespeople_job values
SELECT
    j.id,
    j.title,
    j.is_tradespeople_job,
    j.job_type,
    j.created_at
FROM jobs j
JOIN company_profiles cp ON j.company_id = cp.id
JOIN auth.users u ON cp.user_id = u.id
WHERE u.email = 'soneksss@yahoo.com'
ORDER BY j.created_at DESC;

-- If the is_tradespeople_job field is NULL or incorrect, you can fix it manually:
-- For the vacancy (professional job), set to false:
-- UPDATE jobs SET is_tradespeople_job = false WHERE id = 'YOUR_VACANCY_JOB_ID';

-- For the trade jobs, set to true:
-- UPDATE jobs SET is_tradespeople_job = true WHERE id = 'YOUR_TRADE_JOB_ID_1';
-- UPDATE jobs SET is_tradespeople_job = true WHERE id = 'YOUR_TRADE_JOB_ID_2';

-- ALTERNATIVE: Auto-detect based on job_type and update
-- Typically, trade jobs have job_type = 'contract' and vacancies have other types
-- BUT BE CAREFUL - verify the logic first before running this!
/*
UPDATE jobs
SET is_tradespeople_job = CASE
    WHEN job_type = 'contract' AND homeowner_id IS NOT NULL THEN true
    ELSE false
END
WHERE company_id IN (
    SELECT cp.id
    FROM company_profiles cp
    JOIN auth.users u ON cp.user_id = u.id
    WHERE u.email = 'soneksss@yahoo.com'
);
*/
