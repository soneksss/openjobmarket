-- Script to identify and clean up incomplete/corrupted accounts
-- Run this in Supabase SQL Editor

-- Step 1: Find incomplete professional accounts
-- (users with professional user_type but incomplete profiles)
SELECT
  u.id,
  u.email,
  u.user_type,
  u.created_at,
  pp.first_name,
  pp.last_name,
  pp.title
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id
WHERE u.user_type = 'professional'
  AND (
    pp.id IS NULL
    OR pp.first_name IS NULL
    OR pp.last_name IS NULL
    OR pp.title IS NULL
  )
ORDER BY u.created_at DESC;

-- Step 2: Find incomplete company accounts
SELECT
  u.id,
  u.email,
  u.user_type,
  u.created_at,
  cp.company_name,
  cp.industry,
  cp.location
FROM users u
LEFT JOIN company_profiles cp ON u.id = cp.user_id
WHERE u.user_type = 'company'
  AND (
    cp.id IS NULL
    OR cp.company_name IS NULL
    OR cp.industry IS NULL
  )
ORDER BY u.created_at DESC;

-- Step 3: Find incomplete homeowner accounts
SELECT
  u.id,
  u.email,
  u.user_type,
  u.created_at,
  hp.first_name,
  hp.last_name
FROM users u
LEFT JOIN homeowner_profiles hp ON u.id = hp.user_id
WHERE u.user_type = 'homeowner'
  AND (
    hp.id IS NULL
    OR hp.first_name IS NULL
    OR hp.last_name IS NULL
  )
ORDER BY u.created_at DESC;

-- Step 4: Find orphaned users (in auth but not in users table or vice versa)
-- Note: This requires admin access to auth.users table
SELECT
  u.id,
  u.email,
  u.user_type,
  u.created_at
FROM users u
WHERE u.user_type IS NULL
ORDER BY u.created_at DESC;

-- ===================================================================
-- CLEANUP COMMANDS (Run these after verifying the above queries)
-- ===================================================================

-- Delete incomplete professional profiles
DELETE FROM professional_profiles
WHERE user_id IN (
  SELECT u.id
  FROM users u
  LEFT JOIN professional_profiles pp ON u.id = pp.user_id
  WHERE u.user_type = 'professional'
    AND (
      pp.id IS NULL
      OR pp.first_name IS NULL
      OR pp.last_name IS NULL
      OR pp.title IS NULL
    )
);

-- Delete incomplete company profiles
DELETE FROM company_profiles
WHERE user_id IN (
  SELECT u.id
  FROM users u
  LEFT JOIN company_profiles cp ON u.id = cp.user_id
  WHERE u.user_type = 'company'
    AND (
      cp.id IS NULL
      OR cp.company_name IS NULL
      OR cp.industry IS NULL
    )
);

-- Delete incomplete homeowner profiles
DELETE FROM homeowner_profiles
WHERE user_id IN (
  SELECT u.id
  FROM users u
  LEFT JOIN homeowner_profiles hp ON u.id = hp.user_id
  WHERE u.user_type = 'homeowner'
    AND (
      hp.id IS NULL
      OR hp.first_name IS NULL
      OR hp.last_name IS NULL
    )
);

-- Delete users with incomplete profiles
DELETE FROM users
WHERE id IN (
  -- Incomplete professionals
  SELECT u.id
  FROM users u
  LEFT JOIN professional_profiles pp ON u.id = pp.user_id
  WHERE u.user_type = 'professional'
    AND (
      pp.id IS NULL
      OR pp.first_name IS NULL
      OR pp.last_name IS NULL
      OR pp.title IS NULL
    )

  UNION

  -- Incomplete companies
  SELECT u.id
  FROM users u
  LEFT JOIN company_profiles cp ON u.id = cp.user_id
  WHERE u.user_type = 'company'
    AND (
      cp.id IS NULL
      OR cp.company_name IS NULL
      OR cp.industry IS NULL
    )

  UNION

  -- Incomplete homeowners
  SELECT u.id
  FROM users u
  LEFT JOIN homeowner_profiles hp ON u.id = hp.user_id
  WHERE u.user_type = 'homeowner'
    AND (
      hp.id IS NULL
      OR hp.first_name IS NULL
      OR hp.last_name IS NULL
    )

  UNION

  -- Users with no user_type
  SELECT id FROM users WHERE user_type IS NULL
);

-- Note: Auth users must be deleted manually from Supabase Dashboard
-- Go to Authentication > Users and delete the users by their email addresses
-- that were shown in the SELECT queries above
