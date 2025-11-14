-- Make existing user a super_admin
-- Run this in your Supabase SQL Editor

-- First, ensure the user exists in the users table
INSERT INTO public.users (id, email, user_type, full_name)
VALUES (
    'c6b2d4e9-30c4-4916-9632-288fc2a55053',
    'soneksss@gmail.com',
    'admin',
    'Danils Nazarenko'
) ON CONFLICT (id) DO UPDATE SET
    user_type = 'admin',
    full_name = 'Danils Nazarenko',
    updated_at = NOW();

-- Add the user to admin_users table as super_admin
INSERT INTO public.admin_users (user_id, role, permissions)
VALUES (
    'c6b2d4e9-30c4-4916-9632-288fc2a55053',
    'super_admin',
    ARRAY['all', 'manage_users', 'manage_jobs', 'manage_companies', 'manage_messages', 'view_analytics']
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    permissions = ARRAY['all', 'manage_users', 'manage_jobs', 'manage_companies', 'manage_messages', 'view_analytics'],
    updated_at = NOW();

-- Verify the admin user was created
SELECT
    u.id,
    u.email,
    u.full_name,
    u.user_type,
    au.role,
    au.permissions
FROM public.users u
LEFT JOIN public.admin_users au ON u.id = au.user_id
WHERE u.id = 'c6b2d4e9-30c4-4916-9632-288fc2a55053';