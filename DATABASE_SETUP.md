# Database Setup for Open Job Market

This file contains the SQL scripts needed to set up all required database tables for the Open Job Market application.

## Required Tables

Run these SQL commands in your Supabase SQL Editor in the following order:

### 1. Users Table
```sql
-- Create users table to extend Supabase auth.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('professional', 'company')),
    full_name TEXT,
    nickname TEXT,
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 2. Professional Profiles Table
```sql
-- Create professional_profiles table
CREATE TABLE IF NOT EXISTS public.professional_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT,
    bio TEXT,
    location TEXT,
    experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive')),
    skills TEXT[] DEFAULT '{}',
    portfolio_url TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 3. Company Profiles Table
```sql
-- Create company_profiles table
CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    company_size TEXT,
    website_url TEXT,
    location TEXT,
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 4. Jobs Table
```sql
-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT[],
    salary_min INTEGER,
    salary_max INTEGER,
    location TEXT,
    job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'contract', 'freelance', 'internship')),
    experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive')),
    skills TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 5. Messages Table
```sql
-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'direct' CHECK (message_type IN ('direct', 'reply', 'job_inquiry')),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    conversation_id UUID,
    is_read BOOLEAN DEFAULT false,
    share_personal_info BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 6. Privacy Permissions Table
```sql
-- Create employer_privacy_permissions table
CREATE TABLE IF NOT EXISTS public.employer_privacy_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    employer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    can_see_personal_info BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(professional_id, employer_id)
);
```

### 7. Admin Users Table
```sql
-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## Row Level Security (RLS) Policies

After creating the tables, enable RLS and create policies:

### Enable RLS
```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_privacy_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
```

### Basic RLS Policies
```sql
-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Professional profiles policies
CREATE POLICY "Anyone can view professional profiles" ON public.professional_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own professional profile" ON public.professional_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Company profiles policies
CREATE POLICY "Anyone can view company profiles" ON public.company_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own company profile" ON public.company_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Jobs policies
CREATE POLICY "Anyone can view active jobs" ON public.jobs
    FOR SELECT USING (is_active = true);

CREATE POLICY "Company users can manage their own jobs" ON public.jobs
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.company_profiles WHERE id = company_id
        )
    );

-- Messages policies
CREATE POLICY "Users can view their own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" ON public.messages
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Privacy permissions policies
CREATE POLICY "Users can view their own privacy permissions" ON public.employer_privacy_permissions
    FOR SELECT USING (auth.uid() = professional_id OR auth.uid() = employer_id);

CREATE POLICY "Users can manage privacy permissions they granted" ON public.employer_privacy_permissions
    FOR ALL USING (auth.uid() = professional_id);

-- Admin users policies
CREATE POLICY "Only admins can view admin table" ON public.admin_users
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
    );
```

## Database Functions

### Job Status View (for job expiration)
```sql
-- Create a view for job status with expiration information
CREATE OR REPLACE VIEW public.job_status_view AS
SELECT
    j.*,
    cp.company_name,
    cp.user_id as company_user_id,
    CASE
        WHEN j.expires_at IS NULL THEN 'no_expiration'
        WHEN j.expires_at <= NOW() THEN 'expired'
        WHEN j.expires_at <= NOW() + INTERVAL '3 days' THEN 'expiring_soon'
        ELSE 'active'
    END as expiration_status,
    CASE
        WHEN j.expires_at IS NULL THEN NULL
        ELSE EXTRACT(days FROM j.expires_at - NOW())::integer
    END as days_until_expiration
FROM public.jobs j
LEFT JOIN public.company_profiles cp ON j.company_id = cp.id;
```

### Job Expiration Function
```sql
-- Function to process job expirations
CREATE OR REPLACE FUNCTION public.process_job_expirations()
RETURNS JSON AS $$
DECLARE
    expired_count INTEGER;
    expiring_jobs JSON;
BEGIN
    -- Mark expired jobs as inactive
    UPDATE public.jobs
    SET is_active = false, updated_at = NOW()
    WHERE expires_at <= NOW() AND is_active = true;

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    -- Get jobs expiring in the next 3 days
    SELECT json_agg(
        json_build_object(
            'job_id', id,
            'title', title,
            'company_name', (SELECT company_name FROM public.company_profiles WHERE id = company_id),
            'user_id', (SELECT user_id FROM public.company_profiles WHERE id = company_id),
            'expires_at', expires_at,
            'days_until_expiration', EXTRACT(days FROM expires_at - NOW())::integer
        )
    ) INTO expiring_jobs
    FROM public.jobs
    WHERE expires_at > NOW()
    AND expires_at <= NOW() + INTERVAL '3 days'
    AND is_active = true;

    RETURN json_build_object(
        'expired_count', expired_count,
        'expiring_jobs', COALESCE(expiring_jobs, '[]'::json),
        'processed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Job Extension Function
```sql
-- Function to extend a job with new timeline and pricing
CREATE OR REPLACE FUNCTION public.extend_job(
    job_id_param UUID,
    new_timeline TEXT,
    new_price INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    new_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate new expiry date based on timeline
    CASE new_timeline
        WHEN '1_week' THEN new_expiry := NOW() + INTERVAL '1 week';
        WHEN '2_weeks' THEN new_expiry := NOW() + INTERVAL '2 weeks';
        WHEN '1_month' THEN new_expiry := NOW() + INTERVAL '1 month';
        WHEN '3_months' THEN new_expiry := NOW() + INTERVAL '3 months';
        ELSE new_expiry := NOW() + INTERVAL '1 month';
    END CASE;

    -- Update the job
    UPDATE public.jobs
    SET
        expires_at = new_expiry,
        is_active = true,
        updated_at = NOW()
    WHERE id = job_id_param;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Storage Buckets

Create storage buckets for file uploads:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for company logos
CREATE POLICY "Company logos are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Companies can upload their own logo" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'company-logos' AND
        auth.uid() IN (
            SELECT user_id FROM public.company_profiles
            WHERE id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Companies can update their own logo" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'company-logos' AND
        auth.uid() IN (
            SELECT user_id FROM public.company_profiles
            WHERE id::text = (storage.foldername(name))[1]
        )
    );
```

## Usage Instructions

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste each section above, running them one by one
4. Make sure all tables are created successfully
5. Test the onboarding flow

## Troubleshooting

If you get permission errors:
- Make sure you're running the SQL as the project owner
- Check that RLS policies are correctly set up
- Verify that the auth.users table exists (it should be created automatically by Supabase)

If tables already exist:
- The `CREATE TABLE IF NOT EXISTS` statements will not overwrite existing tables
- You may need to manually add missing columns if the schema has changed