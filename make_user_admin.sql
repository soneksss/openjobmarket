-- Make user soneksss@gmail.com an admin
-- Step 1: Update the user_type in the users table to 'admin'
UPDATE users
SET user_type = 'admin',
    full_name = COALESCE(full_name, 'Admin User')
WHERE id = (SELECT id FROM auth.users WHERE email = 'soneksss@gmail.com');

-- Step 2: Check if admin_users record exists, if not create one
INSERT INTO admin_users (
  user_id,
  name,
  surname,
  email,
  country,
  role,
  is_active,
  permissions
)
SELECT
  u.id,
  COALESCE(SPLIT_PART(u.full_name, ' ', 1), 'Admin'),
  COALESCE(SPLIT_PART(u.full_name, ' ', 2), 'User'),
  au.email,
  'UK',
  'admin',
  true,
  jsonb_build_object(
    'can_manage_users', true,
    'can_manage_settings', true,
    'can_manage_subscriptions', true,
    'can_view_analytics', true,
    'can_reply_messages', true
  )
FROM auth.users au
JOIN users u ON u.id = au.id
WHERE au.email = 'soneksss@gmail.com'
ON CONFLICT (user_id)
DO UPDATE SET
  role = 'admin',
  is_active = true,
  permissions = jsonb_build_object(
    'can_manage_users', true,
    'can_manage_settings', true,
    'can_manage_subscriptions', true,
    'can_view_analytics', true,
    'can_reply_messages', true
  );

-- Step 3: Verify the changes
SELECT
  u.id,
  u.email,
  u.user_type,
  u.full_name,
  au.role as admin_role,
  au.is_active as admin_active,
  au.permissions as admin_permissions
FROM auth.users u
LEFT JOIN users us ON us.id = u.id
LEFT JOIN admin_users au ON au.user_id = u.id
WHERE u.email = 'soneksss@gmail.com';
