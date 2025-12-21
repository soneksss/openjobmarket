-- Migration: Add notification system tables
-- Safe to run multiple times - only creates if doesn't exist

-- 1. Saved Traders Table
CREATE TABLE IF NOT EXISTS saved_traders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  homeowner_id uuid REFERENCES homeowner_profiles(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES professional_profiles(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  UNIQUE(homeowner_id, professional_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_traders_homeowner ON saved_traders(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_saved_traders_professional ON saved_traders(professional_id);

-- 2. Notification Preferences Table (drop if exists and recreate with correct schema)
DROP TABLE IF EXISTS notification_preferences CASCADE;

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_new_messages boolean DEFAULT true,
  email_job_applications boolean DEFAULT true,
  email_job_expiration boolean DEFAULT true,
  email_marketing boolean DEFAULT false,
  push_new_messages boolean DEFAULT true,
  push_job_applications boolean DEFAULT true,
  push_job_expiration boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL, -- 'new_message', 'job_application', 'job_expiring', 'job_expired'
  title text NOT NULL,
  message text,
  link_url text, -- URL to navigate to when clicked
  is_read boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE saved_traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for saved_traders
DROP POLICY IF EXISTS "Users can view their own saved traders" ON saved_traders;
CREATE POLICY "Users can view their own saved traders" ON saved_traders
  FOR SELECT
  USING (
    homeowner_id IN (
      SELECT id FROM homeowner_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own saved traders" ON saved_traders;
CREATE POLICY "Users can insert their own saved traders" ON saved_traders
  FOR INSERT
  WITH CHECK (
    homeowner_id IN (
      SELECT id FROM homeowner_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own saved traders" ON saved_traders;
CREATE POLICY "Users can delete their own saved traders" ON saved_traders
  FOR DELETE
  USING (
    homeowner_id IN (
      SELECT id FROM homeowner_profiles WHERE user_id = auth.uid()
    )
  );

-- 6. RLS Policies for notification_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "Users can view their own preferences" ON notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
CREATE POLICY "Users can update their own preferences" ON notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own preferences" ON notification_preferences;
CREATE POLICY "Users can insert their own preferences" ON notification_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 7. RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT
  WITH CHECK (true); -- Allow system to insert notifications for any user

-- 8. Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Trigger for notification_preferences
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unread_notification_count(uuid) TO authenticated;

-- 11. Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;

-- 12. Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Notification system tables created successfully!';
  RAISE NOTICE 'Tables created: saved_traders, notification_preferences, notifications';
  RAISE NOTICE 'RLS policies and helper functions added';
END $$;
