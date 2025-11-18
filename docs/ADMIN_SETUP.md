# Admin Setup Guide

## Database Setup

To set up the admin system, you need to create the admin_roles table in your Supabase database:

```sql
-- Create admin_roles table
CREATE TABLE admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX idx_admin_roles_active ON admin_roles(is_active);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin roles are viewable by authenticated users" ON admin_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only super admins can manage admin roles" ON admin_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
      AND ar.is_active = true
    )
  );
```

## Creating Your First Admin User

1. First, sign up a regular user account through the normal registration process
2. Get the user's UUID from the auth.users table in Supabase
3. Insert an admin role for that user:

```sql
-- Replace 'USER_UUID_HERE' with the actual user UUID
INSERT INTO admin_roles (user_id, role, is_active)
VALUES ('USER_UUID_HERE', 'super_admin', true);
```

## Accessing Admin Panel

1. Navigate to `/admin/login`
2. Use the credentials of the user you've granted admin privileges to
3. The system will verify admin permissions before allowing access

## Admin Features

- User management
- Job listings management
- Analytics dashboard
- Payment tracking
- Message monitoring

## Security Notes

- Admin access is protected by Row Level Security (RLS)
- Only users with active admin_roles can access admin features
- Super admins can manage other admin accounts
- Regular admins have read-only access to most features