-- Migration: Add Job Application Limits to Subscription Plans
-- Date: 2026-01-08
-- Description: Add tracking for monthly job application limits (for Starter Plan and future use)

-- ============================================================================
-- PART 1: ADD APPLICATION LIMIT COLUMN TO SUBSCRIPTION PLANS
-- ============================================================================

-- Add application_limit column to subscription_plans table
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS application_limit INTEGER DEFAULT NULL;

COMMENT ON COLUMN subscription_plans.application_limit IS
  'Monthly limit for job applications (for professionals/tradespeople). NULL = unlimited.';

-- ============================================================================
-- PART 2: ADD APPLICATION TRACKING TO USER SUBSCRIPTIONS
-- ============================================================================

-- Add application tracking columns to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS applications_used INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS applications_reset_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

COMMENT ON COLUMN user_subscriptions.applications_used IS
  'Number of job applications used in current period';

COMMENT ON COLUMN user_subscriptions.applications_reset_at IS
  'When the application counter was last reset (monthly)';

-- ============================================================================
-- PART 3: CREATE FUNCTION TO CHECK APPLICATION LIMIT
-- ============================================================================

-- Function to check if user can submit a job application
CREATE OR REPLACE FUNCTION public.can_submit_application(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record RECORD;
  can_apply BOOLEAN;
  remaining_applications INTEGER;
  reset_date TIMESTAMPTZ;
BEGIN
  -- Check admin settings first
  IF EXISTS (
    SELECT 1 FROM admin_settings
    WHERE subscriptions_enabled = FALSE
    LIMIT 1
  ) THEN
    -- Subscriptions disabled, unlimited applications
    RETURN json_build_object(
      'can_apply', TRUE,
      'unlimited', TRUE,
      'applications_used', 0,
      'applications_limit', NULL,
      'applications_remaining', NULL
    );
  END IF;

  -- Get active subscription
  SELECT
    us.applications_used,
    us.applications_reset_at,
    sp.application_limit,
    us.end_date
  INTO subscription_record
  FROM user_subscriptions us
  INNER JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_id_param
    AND us.status = 'active'
    AND us.end_date > NOW()
  ORDER BY us.end_date DESC
  LIMIT 1;

  -- No active subscription
  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_apply', FALSE,
      'unlimited', FALSE,
      'applications_used', 0,
      'applications_limit', 0,
      'applications_remaining', 0,
      'message', 'No active subscription. Please subscribe to apply for jobs.'
    );
  END IF;

  -- Check if month has passed since last reset
  IF subscription_record.applications_reset_at + INTERVAL '1 month' < NOW() THEN
    -- Reset the counter
    UPDATE user_subscriptions
    SET applications_used = 0,
        applications_reset_at = NOW()
    WHERE user_id = user_id_param
      AND status = 'active';

    subscription_record.applications_used := 0;
    subscription_record.applications_reset_at := NOW();
  END IF;

  -- Check if unlimited
  IF subscription_record.application_limit IS NULL THEN
    RETURN json_build_object(
      'can_apply', TRUE,
      'unlimited', TRUE,
      'applications_used', subscription_record.applications_used,
      'applications_limit', NULL,
      'applications_remaining', NULL
    );
  END IF;

  -- Check if limit reached
  can_apply := subscription_record.applications_used < subscription_record.application_limit;
  remaining_applications := GREATEST(0, subscription_record.application_limit - subscription_record.applications_used);

  RETURN json_build_object(
    'can_apply', can_apply,
    'unlimited', FALSE,
    'applications_used', subscription_record.applications_used,
    'applications_limit', subscription_record.application_limit,
    'applications_remaining', remaining_applications,
    'reset_date', subscription_record.applications_reset_at + INTERVAL '1 month'
  );
END;
$$;

COMMENT ON FUNCTION public.can_submit_application IS
  'Checks if a user can submit a job application based on their subscription limits';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_submit_application TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_submit_application TO anon;

-- ============================================================================
-- PART 4: CREATE FUNCTION TO INCREMENT APPLICATION COUNTER
-- ============================================================================

-- Function to increment application counter when user applies
CREATE OR REPLACE FUNCTION public.increment_application_counter(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Increment the counter
  UPDATE user_subscriptions
  SET applications_used = applications_used + 1
  WHERE user_id = user_id_param
    AND status = 'active'
    AND end_date > NOW()
  RETURNING applications_used INTO updated_count;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'No active subscription found'
    );
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'applications_used', updated_count
  );
END;
$$;

COMMENT ON FUNCTION public.increment_application_counter IS
  'Increments the job application counter for user subscription';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_application_counter TO authenticated;

-- ============================================================================
-- PART 5: UPDATE EXISTING PLANS WITH APPLICATION LIMITS
-- ============================================================================

-- Update Starter Plan to have 5 applications per month limit
UPDATE subscription_plans
SET application_limit = 5
WHERE name ILIKE '%starter%'
  AND user_type IN ('professional', 'homeowner');

-- Update Basic/Standard plans (if they exist) to have reasonable limits
UPDATE subscription_plans
SET application_limit = 20
WHERE name ILIKE '%basic%'
  AND user_type IN ('professional', 'homeowner')
  AND application_limit IS NULL;

-- Premium/Pro plans should have unlimited (NULL)
UPDATE subscription_plans
SET application_limit = NULL
WHERE name ILIKE '%premium%' OR name ILIKE '%pro%'
  AND user_type IN ('professional', 'homeowner');

-- ============================================================================
-- PART 6: UPDATE get_user_active_subscription FUNCTION
-- ============================================================================

-- Update the existing function to include application limits
CREATE OR REPLACE FUNCTION public.get_user_active_subscription(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record RECORD;
  days_remaining INTEGER;
BEGIN
  -- Check if subscriptions are enabled
  IF EXISTS (
    SELECT 1 FROM admin_settings
    WHERE subscriptions_enabled = FALSE
    LIMIT 1
  ) THEN
    -- Return unlimited access when subscriptions disabled
    RETURN json_build_object(
      'has_subscription', TRUE,
      'plan_name', 'Free (Unlimited)',
      'price', 0,
      'jobs_limit', NULL,
      'contacts_limit', NULL,
      'application_limit', NULL,
      'applications_used', 0,
      'applications_remaining', NULL,
      'unlimited_applications', TRUE,
      'features', json_build_object(
        'unlimited_access', TRUE
      )
    );
  END IF;

  -- Get active subscription
  SELECT
    us.id as subscription_id,
    sp.name as plan_name,
    sp.user_type as plan_type,
    sp.price,
    us.start_date,
    us.end_date,
    us.jobs_used,
    sp.job_limit,
    us.contacts_used,
    sp.contact_limit,
    us.applications_used,
    sp.application_limit,
    us.applications_reset_at,
    sp.features
  INTO subscription_record
  FROM user_subscriptions us
  INNER JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_id_param
    AND us.status = 'active'
    AND us.end_date > NOW()
  ORDER BY us.end_date DESC
  LIMIT 1;

  -- No active subscription
  IF NOT FOUND THEN
    RETURN json_build_object(
      'has_subscription', FALSE
    );
  END IF;

  -- Calculate days remaining
  days_remaining := EXTRACT(DAY FROM (subscription_record.end_date - NOW()));

  -- Check if applications need to be reset
  IF subscription_record.applications_reset_at + INTERVAL '1 month' < NOW() THEN
    UPDATE user_subscriptions
    SET applications_used = 0,
        applications_reset_at = NOW()
    WHERE user_id = user_id_param
      AND status = 'active';

    subscription_record.applications_used := 0;
    subscription_record.applications_reset_at := NOW();
  END IF;

  RETURN json_build_object(
    'has_subscription', TRUE,
    'subscription_id', subscription_record.subscription_id,
    'plan_name', subscription_record.plan_name,
    'plan_type', subscription_record.plan_type,
    'price', subscription_record.price,
    'start_date', subscription_record.start_date,
    'end_date', subscription_record.end_date,
    'days_remaining', days_remaining,
    'jobs_used', subscription_record.jobs_used,
    'jobs_limit', subscription_record.job_limit,
    'contacts_used', subscription_record.contacts_used,
    'contacts_limit', subscription_record.contact_limit,
    'applications_used', subscription_record.applications_used,
    'application_limit', subscription_record.application_limit,
    'applications_remaining',
      CASE
        WHEN subscription_record.application_limit IS NULL THEN NULL
        ELSE GREATEST(0, subscription_record.application_limit - subscription_record.applications_used)
      END,
    'applications_reset_date', subscription_record.applications_reset_at + INTERVAL '1 month',
    'unlimited_applications', subscription_record.application_limit IS NULL,
    'features', subscription_record.features
  );
END;
$$;

COMMENT ON FUNCTION public.get_user_active_subscription IS
  'Returns active subscription details including application limits for the user';

-- ============================================================================
-- PART 7: CREATE INDEX FOR PERFORMANCE
-- ============================================================================

-- Index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status
  ON user_subscriptions(user_id, status, end_date);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_reset_date
  ON user_subscriptions(applications_reset_at);

-- ============================================================================
-- PART 8: VERIFICATION
-- ============================================================================

-- Show updated plans with application limits
COMMENT ON COLUMN subscription_plans.application_limit IS
  'VERIFICATION: Check subscription plans to see application limits.
   Starter plans should have 5, Premium should have NULL (unlimited).';

