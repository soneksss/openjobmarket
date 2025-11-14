-- Update salary_period constraint to match job wizard form values
-- This fixes the "Publishing..." button getting stuck when posting jobs/tasks

-- Drop the old constraint
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_salary_period_check;

-- Add new constraint with all the values used by the job wizard
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_salary_period_check
CHECK (salary_period IN ('per_hour', 'per_day', 'per_week', 'per_month', 'per_year', 'per_job', 'hourly', 'daily', 'yearly'));

-- Update comment to reflect new values
COMMENT ON COLUMN public.jobs.salary_period IS 'Salary payment period: per_hour, per_day, per_week, per_month, per_year, per_job (also supports legacy: hourly, daily, yearly)';
