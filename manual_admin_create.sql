-- First, let's check the current state
SELECT 'Users table:' as info, id, email FROM auth.users WHERE email = 'soneksss@gmail.com';

-- Check if admin_users table exists and its structure
SELECT 'Admin table structure:' as info, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_users'
AND table_schema = 'public';

-- Check if any admin records exist
SELECT 'Existing admins:' as info, * FROM admin_users;

-- Try to create the admin record
INSERT INTO admin_users (user_id, role, name, surname, country, permissions, is_active)
SELECT
    u.id,
    'admin',
    'Sone',
    'Admin',
    'UK',
    '{"can_manage_users": true, "can_manage_settings": true, "can_manage_subscriptions": true, "can_view_analytics": true, "can_reply_messages": true}'::jsonb,
    true
FROM auth.users u
WHERE u.email = 'soneksss@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM admin_users a WHERE a.user_id = u.id
);

-- Verify the admin record was created
SELECT 'Final verification:' as info, au.*, u.email
FROM admin_users au
JOIN auth.users u ON au.user_id = u.id
WHERE u.email = 'soneksss@gmail.com';