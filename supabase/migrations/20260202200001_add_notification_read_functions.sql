-- ============================================================================
-- Migration: Add notification read functions
-- Date: 2026-02-02
-- Purpose: Create RPC functions to mark notifications as read
-- ============================================================================

-- Function to mark a single notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for the current user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = auth.uid()
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Notification Read Functions Added';
  RAISE NOTICE '  - mark_notification_read(UUID)';
  RAISE NOTICE '  - mark_all_notifications_read()';
  RAISE NOTICE '========================================';
END $$;
