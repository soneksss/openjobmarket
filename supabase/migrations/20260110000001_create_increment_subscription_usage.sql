-- Migration: Create increment_subscription_usage function
-- Date: 2026-01-10
-- Description: Creates the missing RPC function to increment job/contact usage counters

-- ============================================================================
-- CREATE FUNCTION TO INCREMENT SUBSCRIPTION USAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_subscription_usage(
  user_id_param UUID,
  usage_type TEXT -- 'job' or 'contact'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_jobs_count INTEGER;
  updated_contacts_count INTEGER;
  subscription_exists BOOLEAN;
BEGIN
  -- Check if subscriptions are enabled
  IF EXISTS (
    SELECT 1 FROM admin_settings
    WHERE subscriptions_enabled = FALSE
    LIMIT 1
  ) THEN
    -- Subscriptions disabled, return success without incrementing
    RETURN json_build_object(
      'success', TRUE,
      'message', 'Subscriptions disabled - usage not tracked'
    );
  END IF;

  -- Check if user has an active subscription
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = user_id_param
      AND status = 'active'
      AND end_date > NOW()
  ) INTO subscription_exists;

  -- If no active subscription, still return success (allow posting)
  IF NOT subscription_exists THEN
    RETURN json_build_object(
      'success', TRUE,
      'message', 'No active subscription - usage not tracked'
    );
  END IF;

  -- Increment the appropriate counter based on usage_type
  IF usage_type = 'job' THEN
    UPDATE user_subscriptions
    SET jobs_used = COALESCE(jobs_used, 0) + 1
    WHERE user_id = user_id_param
      AND status = 'active'
      AND end_date > NOW()
    RETURNING jobs_used INTO updated_jobs_count;

    RETURN json_build_object(
      'success', TRUE,
      'usage_type', 'job',
      'jobs_used', updated_jobs_count
    );

  ELSIF usage_type = 'contact' THEN
    UPDATE user_subscriptions
    SET contacts_used = COALESCE(contacts_used, 0) + 1
    WHERE user_id = user_id_param
      AND status = 'active'
      AND end_date > NOW()
    RETURNING contacts_used INTO updated_contacts_count;

    RETURN json_build_object(
      'success', TRUE,
      'usage_type', 'contact',
      'contacts_used', updated_contacts_count
    );

  ELSE
    -- Invalid usage_type
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Invalid usage_type. Must be "job" or "contact"'
    );
  END IF;

END;
$$;

COMMENT ON FUNCTION public.increment_subscription_usage IS
  'Increments the job or contact usage counter for active user subscription';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_subscription_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_subscription_usage TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

COMMENT ON FUNCTION public.increment_subscription_usage IS
  'VERIFICATION: This function increments jobs_used or contacts_used in user_subscriptions.
   Usage: SELECT increment_subscription_usage(''user-uuid'', ''job'');
   Returns: JSON with success status and updated count.';
