-- Migration: Add notification delete functionality
-- Description: Allows users to delete their own notifications

-- Add RLS policy for DELETE on notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Create delete notification function
CREATE OR REPLACE FUNCTION delete_notification(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_notification(UUID) TO authenticated;

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Notification Delete Functionality Added';
  RAISE NOTICE '  - Added DELETE RLS policy';
  RAISE NOTICE '  - Created delete_notification function';
  RAISE NOTICE '========================================';
END $$;
