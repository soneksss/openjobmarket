-- ============================================
-- REQUIRED FIELDS FOR SIGNUP
-- Shows what data is REQUIRED vs OPTIONAL for successful signup
-- ============================================

-- STEP 1: SIGNUP CREATES AUTH.USERS
-- Required: email, password
-- Optional: raw_user_meta_data (all metadata is optional)
/*
  Minimum signup call:
  await supabase.auth.signUp({
    email: 'user@example.com',
    password: 'password123',
    options: {
      data: {
        user_type: 'professional',  // REQUIRED for profile creation
        account_type: 'individual'  // REQUIRED
      }
    }
  })
*/

-- STEP 2: TRIGGER CREATES PUBLIC.USERS
-- Check what columns are NOT NULL in public.users
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠️ REQUIRED - NO DEFAULT'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN '✓ REQUIRED - HAS DEFAULT'
    ELSE '○ OPTIONAL'
  END as requirement_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY
  CASE WHEN is_nullable = 'NO' THEN 1 ELSE 2 END,
  ordinal_position;

-- STEP 3: PROFILE CREATION REQUIRED FIELDS
-- Professional Profiles
SELECT
  'PROFESSIONAL_PROFILES' as profile_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at', 'updated_at') THEN '🔧 AUTO-GENERATED'
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠️ MUST PROVIDE'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN '✓ HAS DEFAULT'
    ELSE '○ OPTIONAL'
  END as requirement_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'professional_profiles'
  AND column_name NOT IN ('id', 'created_at', 'updated_at')
ORDER BY
  CASE
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN 1
    WHEN is_nullable = 'NO' THEN 2
    ELSE 3
  END,
  ordinal_position;

-- Company Profiles
SELECT
  'COMPANY_PROFILES' as profile_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at', 'updated_at') THEN '🔧 AUTO-GENERATED'
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠️ MUST PROVIDE'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN '✓ HAS DEFAULT'
    ELSE '○ OPTIONAL'
  END as requirement_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'company_profiles'
  AND column_name NOT IN ('id', 'created_at', 'updated_at')
ORDER BY
  CASE
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN 1
    WHEN is_nullable = 'NO' THEN 2
    ELSE 3
  END,
  ordinal_position;

-- Contractor Profiles
SELECT
  'CONTRACTOR_PROFILES' as profile_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at', 'updated_at') THEN '🔧 AUTO-GENERATED'
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠️ MUST PROVIDE'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN '✓ HAS DEFAULT'
    ELSE '○ OPTIONAL'
  END as requirement_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contractor_profiles'
  AND column_name NOT IN ('id', 'created_at', 'updated_at')
ORDER BY
  CASE
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN 1
    WHEN is_nullable = 'NO' THEN 2
    ELSE 3
  END,
  ordinal_position;

-- Homeowner Profiles
SELECT
  'HOMEOWNER_PROFILES' as profile_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at', 'updated_at') THEN '🔧 AUTO-GENERATED'
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠️ MUST PROVIDE'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN '✓ HAS DEFAULT'
    ELSE '○ OPTIONAL'
  END as requirement_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'homeowner_profiles'
  AND column_name NOT IN ('id', 'created_at', 'updated_at')
ORDER BY
  CASE
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN 1
    WHEN is_nullable = 'NO' THEN 2
    ELSE 3
  END,
  ordinal_position;

-- SUMMARY: MINIMUM REQUIRED DATA FOR SIGNUP
/*
┌─────────────────────────────────────────────────────────────────┐
│ MINIMUM DATA REQUIRED FOR SUCCESSFUL SIGNUP                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. AUTH.USERS (via supabase.auth.signUp)                       │
│    ✓ email (required)                                          │
│    ✓ password (required)                                       │
│                                                                 │
│ 2. METADATA (options.data)                                     │
│    ✓ user_type (professional/company/contractor/homeowner)    │
│    ✓ account_type (individual/business)                       │
│    ○ first_name (for professionals)                           │
│    ○ last_name (for professionals)                            │
│    ○ company_name (for companies/contractors)                 │
│    ○ location (optional but recommended)                      │
│    ○ latitude/longitude (optional)                            │
│    ○ phone (optional)                                         │
│    ○ trade/services (optional)                                │
│                                                                 │
│ 3. PROFILE CREATION (happens after email verification)        │
│    - NOW OPTIONAL (after our fix)                             │
│    - Dashboard handles onboarding                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

MINIMUM WORKING SIGNUP:
{
  email: "user@example.com",
  password: "password123",
  options: {
    data: {
      user_type: "professional",
      account_type: "individual"
    }
  }
}

RECOMMENDED SIGNUP (with basic info):
{
  email: "user@example.com",
  password: "password123",
  options: {
    data: {
      user_type: "professional",
      account_type: "individual",
      first_name: "John",
      last_name: "Doe",
      location: "London, UK",
      trade: "Plumber"
    }
  }
}
*/
