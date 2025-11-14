-- Add latitude and longitude columns to users table for location-based matching
-- Required for Jobseekers and Tradespeople to be found by employers/homeowners

-- Add latitude and longitude columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create spatial index for efficient location queries
-- Only index rows that have location data (partial index)
CREATE INDEX IF NOT EXISTS idx_users_location
ON users(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for jobseekers with location (for employer searches)
CREATE INDEX IF NOT EXISTS idx_jobseekers_location
ON users(latitude, longitude)
WHERE is_jobseeker = TRUE AND latitude IS NOT NULL;

-- Create index for tradespeople with location (for homeowner searches)
CREATE INDEX IF NOT EXISTS idx_tradespeople_location
ON users(latitude, longitude)
WHERE is_tradespeople = TRUE AND latitude IS NOT NULL;

-- Add comments to document the purpose
COMMENT ON COLUMN users.latitude IS 'Latitude coordinate for user location (required for jobseekers and tradespeople)';
COMMENT ON COLUMN users.longitude IS 'Longitude coordinate for user location (required for jobseekers and tradespeople)';

-- Add location coordinates to professional_profiles table
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Add location coordinates to company_profiles table
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Add comprehensive job fields for vacancy posting (Indeed.com style)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS formatted_address TEXT,
ADD COLUMN IF NOT EXISTS job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'remote', 'contract', 'freelance', 'internship')),
ADD COLUMN IF NOT EXISTS experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive')),
ADD COLUMN IF NOT EXISTS experience_levels TEXT[], -- Array of experience levels (for multi-select support)
ADD COLUMN IF NOT EXISTS salary_min DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS salary_max DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS salary_period TEXT CHECK (salary_period IN ('hourly', 'daily', 'yearly')),
ADD COLUMN IF NOT EXISTS skills TEXT[], -- Array of skills
ADD COLUMN IF NOT EXISTS languages TEXT[], -- Array of required languages
ADD COLUMN IF NOT EXISTS benefits TEXT[]; -- Array of benefits

-- Make experience_level nullable (not required for tradespeople tasks)
-- This allows the column to be NULL for simple task postings
ALTER TABLE public.jobs ALTER COLUMN experience_level DROP NOT NULL;

-- Create indexes for efficient location-based queries
CREATE INDEX IF NOT EXISTS idx_professional_profiles_location ON public.professional_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_company_profiles_location ON public.company_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(latitude, longitude);

-- Create indexes for city/country searches
CREATE INDEX IF NOT EXISTS idx_professional_profiles_city_country ON public.professional_profiles(city, country);
CREATE INDEX IF NOT EXISTS idx_company_profiles_city_country ON public.company_profiles(city, country);
CREATE INDEX IF NOT EXISTS idx_jobs_city_country ON public.jobs(city, country);

-- Create indexes for job filtering
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON public.jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON public.jobs(experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_levels ON public.jobs USING GIN(experience_levels); -- Index for multi-select experience levels
CREATE INDEX IF NOT EXISTS idx_jobs_salary ON public.jobs(salary_min, salary_max);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON public.jobs USING GIN(skills);

-- Add comments
COMMENT ON COLUMN jobs.job_type IS 'Type of employment: full-time, part-time, remote, contract, freelance, internship';
COMMENT ON COLUMN jobs.experience_level IS 'Required experience level: entry, mid, senior, lead, executive';
COMMENT ON COLUMN jobs.salary_period IS 'Salary payment period: hourly, daily, yearly';
COMMENT ON COLUMN jobs.skills IS 'Array of required skills for the job';
COMMENT ON COLUMN jobs.languages IS 'Array of required languages';
COMMENT ON COLUMN jobs.benefits IS 'Array of job benefits';
