-- Create enum for deletion reasons
DO $$ BEGIN
  CREATE TYPE deletion_reason_type AS ENUM (
    'cant_find_what_looking_for',
    'not_enough_users',
    'too_complicated',
    'poor_ux',
    'trust_safety_concerns',
    'found_alternative',
    'temporary_use',
    'technical_issues',
    'privacy_concerns',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create table to track account deletions
CREATE TABLE IF NOT EXISTS account_deletion_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT, -- 'professional', 'company', 'homeowner', 'jobseeker', 'tradespeople'
  primary_reason deletion_reason_type NOT NULL,
  custom_message TEXT,
  country TEXT,
  locale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Store user metadata before deletion
  account_created_at TIMESTAMP WITH TIME ZONE,
  days_as_member INTEGER
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_deletion_reasons_created_at ON account_deletion_reasons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_reasons_primary_reason ON account_deletion_reasons(primary_reason);
CREATE INDEX IF NOT EXISTS idx_deletion_reasons_user_role ON account_deletion_reasons(user_role);
CREATE INDEX IF NOT EXISTS idx_deletion_reasons_country ON account_deletion_reasons(country);

-- Add RLS policies
ALTER TABLE account_deletion_reasons ENABLE ROW LEVEL SECURITY;

-- Only admins can view deletion reasons
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view all deletion reasons" ON account_deletion_reasons;
  CREATE POLICY "Admins can view all deletion reasons"
    ON account_deletion_reasons
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.user_type = 'admin'
      )
    );
END $$;

-- System can insert deletion reasons (via function)
DO $$ BEGIN
  DROP POLICY IF EXISTS "System can insert deletion reasons" ON account_deletion_reasons;
  CREATE POLICY "System can insert deletion reasons"
    ON account_deletion_reasons
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
END $$;

-- Add comment
COMMENT ON TABLE account_deletion_reasons IS 'Tracks reasons why users delete their accounts for analytics and retention insights';
