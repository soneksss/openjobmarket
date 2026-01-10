-- Migration: Create subscription permission check functions
-- Date: 2026-01-10
-- Description: Creates missing RPC functions to check job posting and contact permissions

-- ============================================================================
-- PART 1: CREATE FUNCTION TO CHECK JOB POSTING PERMISSION
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.can_user_post_job(UUID);

CREATE OR REPLACE FUNCTION public.can_user_post_job(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record RECORD;
  can_post BOOLEAN;
  jobs_remaining INTEGER;
BEGIN
  -- Check if subscriptions are enabled in admin settings
  IF EXISTS (
    SELECT 1 FROM admin_settings
    WHERE subscriptions_enabled = FALSE
    LIMIT 1
  ) THEN
    -- Subscriptions disabled, unlimited job posting allowed
    RETURN json_build_object(
      'can_post', TRUE,
      'unlimited', TRUE,
      'jobs_used', 0,
      'jobs_limit', NULL,
      'jobs_remaining', NULL,
      'reason', 'subscriptions_disabled'
    );
  END IF;

  -- Get active subscription with job limits
  SELECT
    us.jobs_used,
    sp.job_limit,
    us.end_date,
    sp.name as plan_name
  INTO subscription_record
  FROM user_subscriptions us
  INNER JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_id_param
    AND us.status = 'active'
    AND us.end_date > NOW()
  ORDER BY us.end_date DESC
  LIMIT 1;

  -- No active subscription found
  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_post', FALSE,
      'unlimited', FALSE,
      'jobs_used', 0,
      'jobs_limit', 0,
      'jobs_remaining', 0,
      'reason', 'no_subscription',
      'message', 'No active subscription. Please subscribe to post jobs.'
    );
  END IF;

  -- Check if unlimited (NULL job_limit)
  IF subscription_record.job_limit IS NULL THEN
    RETURN json_build_object(
      'can_post', TRUE,
      'unlimited', TRUE,
      'jobs_used', COALESCE(subscription_record.jobs_used, 0),
      'jobs_limit', NULL,
      'jobs_remaining', NULL,
      'plan_name', subscription_record.plan_name
    );
  END IF;

  -- Check if job limit exceeded
  can_post := COALESCE(subscription_record.jobs_used, 0) < subscription_record.job_limit;
  jobs_remaining := GREATEST(0, subscription_record.job_limit - COALESCE(subscription_record.jobs_used, 0));

  IF NOT can_post THEN
    RETURN json_build_object(
      'can_post', FALSE,
      'unlimited', FALSE,
      'jobs_used', COALESCE(subscription_record.jobs_used, 0),
      'jobs_limit', subscription_record.job_limit,
      'jobs_remaining', 0,
      'reason', 'job_limit_exceeded',
      'message', 'Job posting limit reached. Please upgrade your subscription.',
      'plan_name', subscription_record.plan_name
    );
  END IF;

  -- Can post
  RETURN json_build_object(
    'can_post', TRUE,
    'unlimited', FALSE,
    'jobs_used', COALESCE(subscription_record.jobs_used, 0),
    'jobs_limit', subscription_record.job_limit,
    'jobs_remaining', jobs_remaining,
    'plan_name', subscription_record.plan_name
  );
END;
$$;

COMMENT ON FUNCTION public.can_user_post_job(UUID) IS
  'Checks if a user can post a job based on their subscription limits. Respects admin subscription settings.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_user_post_job(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_post_job(UUID) TO anon;

-- ============================================================================
-- PART 2: CREATE FUNCTION TO CHECK CONTACT PERMISSION
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.can_user_contact_professional(UUID);

CREATE OR REPLACE FUNCTION public.can_user_contact_professional(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record RECORD;
  can_contact BOOLEAN;
  contacts_remaining INTEGER;
BEGIN
  -- Check if subscriptions are enabled in admin settings
  IF EXISTS (
    SELECT 1 FROM admin_settings
    WHERE subscriptions_enabled = FALSE
    LIMIT 1
  ) THEN
    -- Subscriptions disabled, unlimited contacts allowed
    RETURN json_build_object(
      'can_contact', TRUE,
      'unlimited', TRUE,
      'contacts_used', 0,
      'contacts_limit', NULL,
      'contacts_remaining', NULL,
      'reason', 'subscriptions_disabled'
    );
  END IF;

  -- Get active subscription with contact limits
  SELECT
    us.contacts_used,
    sp.contact_limit,
    us.end_date,
    sp.name as plan_name
  INTO subscription_record
  FROM user_subscriptions us
  INNER JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_id_param
    AND us.status = 'active'
    AND us.end_date > NOW()
  ORDER BY us.end_date DESC
  LIMIT 1;

  -- No active subscription found
  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_contact', FALSE,
      'unlimited', FALSE,
      'contacts_used', 0,
      'contacts_limit', 0,
      'contacts_remaining', 0,
      'reason', 'no_subscription',
      'message', 'No active subscription. Please subscribe to contact professionals.'
    );
  END IF;

  -- Check if unlimited (NULL contact_limit)
  IF subscription_record.contact_limit IS NULL THEN
    RETURN json_build_object(
      'can_contact', TRUE,
      'unlimited', TRUE,
      'contacts_used', COALESCE(subscription_record.contacts_used, 0),
      'contacts_limit', NULL,
      'contacts_remaining', NULL,
      'plan_name', subscription_record.plan_name
    );
  END IF;

  -- Check if contact limit exceeded
  can_contact := COALESCE(subscription_record.contacts_used, 0) < subscription_record.contact_limit;
  contacts_remaining := GREATEST(0, subscription_record.contact_limit - COALESCE(subscription_record.contacts_used, 0));

  IF NOT can_contact THEN
    RETURN json_build_object(
      'can_contact', FALSE,
      'unlimited', FALSE,
      'contacts_used', COALESCE(subscription_record.contacts_used, 0),
      'contacts_limit', subscription_record.contact_limit,
      'contacts_remaining', 0,
      'reason', 'contact_limit_exceeded',
      'message', 'Contact limit reached. Please upgrade your subscription.',
      'plan_name', subscription_record.plan_name
    );
  END IF;

  -- Can contact
  RETURN json_build_object(
    'can_contact', TRUE,
    'unlimited', FALSE,
    'contacts_used', COALESCE(subscription_record.contacts_used, 0),
    'contacts_limit', subscription_record.contact_limit,
    'contacts_remaining', contacts_remaining,
    'plan_name', subscription_record.plan_name
  );
END;
$$;

COMMENT ON FUNCTION public.can_user_contact_professional(UUID) IS
  'Checks if a user can contact professionals based on their subscription limits. Respects admin subscription settings.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_user_contact_professional(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_contact_professional(UUID) TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Note: All COMMENT statements updated to include (UUID) signature to avoid conflicts
