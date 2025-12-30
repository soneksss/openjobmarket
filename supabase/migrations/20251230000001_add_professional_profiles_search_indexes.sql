-- Add indexes to optimize professional_profiles search queries
-- This fixes the timeout issue when searching for talents/professionals

-- Ensure pg_trgm extension is enabled for text search (must be before using it)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Composite index for the most common query pattern (profile_visible + available_for_work + ordering)
CREATE INDEX IF NOT EXISTS idx_professional_profiles_search
ON professional_profiles(profile_visible, available_for_work, created_at DESC);

-- Spatial index for location-based searches
CREATE INDEX IF NOT EXISTS idx_professional_profiles_location
ON professional_profiles(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for experience level filtering
CREATE INDEX IF NOT EXISTS idx_professional_profiles_experience
ON professional_profiles(experience_level)
WHERE profile_visible = true AND available_for_work = true;

-- Index for employment status filtering
CREATE INDEX IF NOT EXISTS idx_professional_profiles_employment
ON professional_profiles(employment_status, is_self_employed)
WHERE profile_visible = true AND available_for_work = true;

-- Index for text search on name and title
CREATE INDEX IF NOT EXISTS idx_professional_profiles_text_search
ON professional_profiles USING gin(
  (first_name || ' ' || last_name || ' ' || COALESCE(title, '')) gin_trgm_ops
);

-- Add comment explaining the indexes
COMMENT ON INDEX idx_professional_profiles_search IS 'Optimizes the base query for visible and available professionals ordered by creation date';
COMMENT ON INDEX idx_professional_profiles_location IS 'Optimizes location-based radius searches using bounding box queries';
COMMENT ON INDEX idx_professional_profiles_experience IS 'Optimizes filtering by experience level';
COMMENT ON INDEX idx_professional_profiles_employment IS 'Optimizes filtering by employment status and self-employment';
COMMENT ON INDEX idx_professional_profiles_text_search IS 'Optimizes text search on professional names and titles using trigram matching';
