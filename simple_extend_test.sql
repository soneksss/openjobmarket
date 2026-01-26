-- Simple Extend Test with Actual Results
-- This will test extending the first expired job and show you the results

-- STEP 1: Test extending the first expired job
-- Using job ID: a5a71239-7178-46ba-b565-069a112f8525
-- (The Plumber job that expired 47.9 days ago)

-- First, let's see the job BEFORE extension
SELECT
  'BEFORE Extension' as stage,
  id,
  title,
  expires_at,
  recruitment_timeline,
  price,
  is_active,
  ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400::numeric, 1) as days_until_expiration
FROM jobs
WHERE id = 'a5a71239-7178-46ba-b565-069a112f8525'::UUID;

-- Now extend it by 7 days for £10
SELECT extend_job(
  'a5a71239-7178-46ba-b565-069a112f8525'::UUID,
  '7_days'::TEXT,
  10::NUMERIC
) as extension_successful;

-- Check the job AFTER extension
SELECT
  'AFTER Extension' as stage,
  id,
  title,
  expires_at,
  recruitment_timeline,
  price,
  is_active,
  updated_at,
  ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400::numeric, 1) as days_until_expiration
FROM jobs
WHERE id = 'a5a71239-7178-46ba-b565-069a112f8525'::UUID;
