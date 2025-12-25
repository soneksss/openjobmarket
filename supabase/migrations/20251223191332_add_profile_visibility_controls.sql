-- Add profile visibility and messaging controls to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS allow_messages BOOLEAN DEFAULT true NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN users.profile_visible IS 'Controls whether the user profile is visible to other users';
COMMENT ON COLUMN users.allow_messages IS 'Controls whether other users can send direct messages to this user';

-- Update existing users to have default values (true for both)
UPDATE users
SET profile_visible = true, allow_messages = true
WHERE profile_visible IS NULL OR allow_messages IS NULL;
