-- Add languages column to jobs table
-- This migration adds support for specifying required languages for job postings

-- Add the languages column as a text array
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS languages text[];

-- Add a comment to document the column
COMMENT ON COLUMN jobs.languages IS 'Array of languages required or preferred for the job (e.g., ["English", "Spanish"])';

-- Create an index for better query performance when filtering by languages
CREATE INDEX IF NOT EXISTS idx_jobs_languages ON jobs USING GIN (languages);

-- Optional: You can also add a check to ensure language names are not empty
-- ALTER TABLE jobs ADD CONSTRAINT check_languages_not_empty
-- CHECK (languages IS NULL OR array_length(languages, 1) IS NULL OR
--        NOT EXISTS (SELECT 1 FROM unnest(languages) AS lang WHERE lang = '' OR lang IS NULL));
