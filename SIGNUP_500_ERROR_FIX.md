# Supabase Signup 500 Error Fix

## Problem

**Error**: `/auth/v1/signup` returns 500 Internal Server Error

**Root Cause**: The `handle_new_user()` trigger function tries to insert records with NULL values into columns that have NOT NULL constraints:
- `professional_profiles`: `first_name`, `last_name` are NOT NULL
- `company_profiles`: `company_name` is NOT NULL
- `homeowner_profiles`: `first_name`, `last_name` are NOT NULL

When users sign up without providing these fields in `raw_user_meta_data`, the INSERT fails with a constraint violation, causing a 500 error.

**Additional Issue**: The previous trigger tried to create multiple profiles for multi-role users (e.g., both professional AND company profiles for self-employed), which could cause conflicts.

## Solution

Created a fixed trigger that:
1. ✅ Provides sensible defaults for all NOT NULL fields
2. ✅ Creates ONLY ONE primary profile based on user_type/role flags
3. ✅ Handles multi-role users correctly
4. ✅ Maintains orphaned record cleanup for re-signup scenarios
5. ✅ Is fully idempotent with ON CONFLICT handling

## Files Created

### 1. Fixed Trigger Migration
**File**: `supabase/migrations/20260117000005_fix_signup_trigger_null_handling.sql`

**Key Changes**:

**Defaults for NOT NULL fields**:
```sql
-- Provide defaults for empty strings on NOT NULL fields
IF first_name = '' THEN
  first_name := 'User';
END IF;

IF last_name = '' THEN
  last_name := SPLIT_PART(NEW.email, '@', 1); -- Use email username as fallback
END IF;

IF company_name = '' THEN
  company_name := 'Company'; -- Default company name
END IF;
```

**Single Profile Creation Logic**:
```sql
-- Create ONLY ONE primary profile based on user_type
IF user_type IN ('professional', 'jobseeker') OR (is_jobseeker AND NOT is_employer) THEN
  -- Create professional profile
ELSIF user_type = 'company' OR is_employer OR (is_tradespeople AND account_type = 'company') THEN
  -- Create company profile
ELSIF user_type = 'homeowner' OR is_homeowner THEN
  -- Create homeowner profile
ELSE
  -- Fallback: Create professional profile
END IF;
```

### 2. Test Script
**File**: `supabase/migrations/20260117000006_test_signup_trigger.sql`

Tests 5 signup scenarios:
1. Minimal signup (no names provided) - uses defaults
2. Company signup with company_name
3. Multi-role signup (jobseeker + homeowner)
4. Self-employed signup (company account)
5. Re-signup scenario (orphaned record cleanup)

## Deployment Steps

### Step 1: Deploy the Fixed Trigger

**Option A: Using Supabase CLI (Recommended)**
```bash
cd c:\Users\sonek\OneDrive\Desktop\MAIN\openjobmarket
supabase db push
```

**Option B: Manual SQL Execution**
Run in Supabase Dashboard → SQL Editor:
```sql
-- Copy and paste contents of:
-- supabase/migrations/20260117000005_fix_signup_trigger_null_handling.sql
```

### Step 2: Test the Fix

**Option 1: Run automated test script**
```sql
-- Copy and paste contents of:
-- supabase/migrations/20260117000006_test_signup_trigger.sql
```

This will run all 5 test scenarios and show results.

**Option 2: Manual test via UI**
1. Go to your signup page
2. Try to create an account with minimal information
3. Signup should succeed without 500 error

### Step 3: Verify Trigger is Active

Run in Supabase Dashboard → SQL Editor:
```sql
-- Check trigger exists and is enabled
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

Expected result:
```
tgname                | tgenabled
----------------------|-----------
on_auth_user_created  | O
```
(`O` = enabled)

### Step 4: Check Supabase Logs

After deployment, monitor logs for successful signups:
1. Go to Supabase Dashboard → Logs → Database
2. Filter for "Creating user and profile for:"
3. Should see NOTICE logs showing successful profile creation

## Testing Checklist

### Test 1: Minimal Signup (Most Common Failure Case)
- [ ] Go to `/auth/sign-up`
- [ ] Enter only email and password (no names)
- [ ] Click "Create Account"
- [ ] ✅ Expected: Signup succeeds, user is created
- [ ] ❌ Before fix: 500 error

### Test 2: Full Signup with All Fields
- [ ] Go to `/auth/sign-up`
- [ ] Enter email, password, first name, last name
- [ ] Select user type (e.g., Professional)
- [ ] Click "Create Account"
- [ ] ✅ Expected: Signup succeeds with provided names

### Test 3: Company Signup
- [ ] Go to `/auth/sign-up`
- [ ] Select "Company Owner" or "Self-Employed"
- [ ] Enter company name
- [ ] Click "Create Account"
- [ ] ✅ Expected: Signup succeeds, company profile created

### Test 4: Multi-Role Signup (Jobseeker + Homeowner)
- [ ] Use Quick Check modal
- [ ] Select "Employed" or "Unemployed"
- [ ] Complete signup
- [ ] ✅ Expected: Professional profile created (primary)
- [ ] ✅ Expected: is_jobseeker=true, is_homeowner=true in users table

### Test 5: Re-signup After Deletion
- [ ] Create account → Delete account → Re-signup with same email
- [ ] ✅ Expected: No errors, fresh account created

## Verification Queries

### Check if trigger is working
```sql
-- After a signup attempt, check if user and profile were created
SELECT
  u.email,
  u.user_type,
  u.is_jobseeker,
  u.is_homeowner,
  u.is_employer,
  u.is_tradespeople,
  CASE
    WHEN pp.id IS NOT NULL THEN 'professional'
    WHEN cp.id IS NOT NULL THEN 'company'
    WHEN hp.id IS NOT NULL THEN 'homeowner'
    ELSE 'none'
  END as profile_type
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id
LEFT JOIN company_profiles cp ON u.id = cp.user_id
LEFT JOIN homeowner_profiles hp ON u.id = hp.user_id
WHERE u.email = 'test@example.com';
```

### Check for users without profiles (should be 0)
```sql
-- This should return no rows
SELECT u.email, u.user_type
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id
LEFT JOIN company_profiles cp ON u.id = cp.user_id
LEFT JOIN homeowner_profiles hp ON u.id = hp.user_id
WHERE pp.id IS NULL AND cp.id IS NULL AND hp.id IS NULL;
```

### Check default names are being used
```sql
-- Check if any users have default names
SELECT
  pp.first_name,
  pp.last_name,
  u.email
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
WHERE pp.first_name = 'User' OR pp.last_name LIKE '%@%';
```

## Rollback Plan

If the fix causes issues, rollback to the previous trigger:

```sql
-- Restore previous trigger (from 20260117000003)
-- Copy contents from:
-- supabase/migrations/20260117000003_improve_signup_trigger_comprehensive.sql
```

## What Changed

### Before (Broken)
```sql
-- NO defaults provided
first_name := (NEW.raw_user_meta_data->>'first_name')::TEXT;
last_name := (NEW.raw_user_meta_data->>'last_name')::TEXT;
company_name := (NEW.raw_user_meta_data->>'company_name')::TEXT;

-- Could create MULTIPLE profiles
IF user_type = 'professional' OR is_jobseeker OR is_tradespeople THEN
  -- Create professional profile
END IF;

IF user_type = 'company' OR is_employer THEN
  -- Create company profile (could run BOTH if-blocks)
END IF;
```

**Result**: If first_name is NULL → INSERT fails → 500 error

### After (Fixed)
```sql
-- Defaults provided with COALESCE and fallbacks
first_name := COALESCE((NEW.raw_user_meta_data->>'first_name')::TEXT, '');
IF first_name = '' THEN
  first_name := 'User'; -- Default value
END IF;

last_name := COALESCE((NEW.raw_user_meta_data->>'last_name')::TEXT, '');
IF last_name = '' THEN
  last_name := SPLIT_PART(NEW.email, '@', 1); -- Use email username
END IF;

-- Creates ONLY ONE profile using ELSIF
IF user_type IN ('professional', 'jobseeker') THEN
  -- Create professional profile
ELSIF user_type = 'company' OR is_employer THEN
  -- Create company profile (mutually exclusive)
ELSIF user_type = 'homeowner' THEN
  -- Create homeowner profile
ELSE
  -- Fallback to professional
END IF;
```

**Result**: Always has valid values → INSERT succeeds → 200 OK

## Common Signup Scenarios and Profile Creation

| User Selection | account_type | Roles | Profile Created |
|---|---|---|---|
| Homeowner | individual | homeowner | homeowner_profiles |
| Employed/Unemployed | individual | jobseeker, homeowner | professional_profiles |
| Self-Employed | company | tradespeople, employer | company_profiles |
| Company Owner | company | employer | company_profiles |
| Agency | company | employer | company_profiles |
| Just Browsing | individual | homeowner | homeowner_profiles |

## Expected Database Logs

After successful signup, you should see these logs in Supabase Dashboard → Logs → Database:

```
NOTICE: ========================================
NOTICE: Creating user and profile for: user@example.com
NOTICE: ========================================
NOTICE: No orphaned records found for email user@example.com
NOTICE: Created/updated public.users record for user@example.com
NOTICE: Created professional profile for user@example.com
NOTICE: Successfully created all records for user@example.com
NOTICE: ========================================
```

## Troubleshooting

### Issue: Still getting 500 error after deployment

**Check**:
```sql
-- Verify trigger is using the new function
SELECT tgname, tgfoid::regproc
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

**Fix**: Re-run the migration or manually drop and recreate trigger

### Issue: Trigger not firing

**Check**:
```sql
-- Check if trigger is enabled
SELECT tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Fix**:
```sql
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

### Issue: User created but no profile

**Check Database Logs**: Look for error messages in the trigger

**Common causes**:
1. Profile table has additional NOT NULL columns not handled
2. Foreign key constraint failure
3. Check constraint failure (e.g., experience_level enum)

**Fix**: Update trigger to provide defaults for missing columns

## Success Criteria

✅ `/auth/v1/signup` returns 200 OK (not 500)
✅ User is created in auth.users
✅ User is created in public.users
✅ Appropriate profile is created (professional, company, or homeowner)
✅ Re-signup with same email works after deletion
✅ Multi-role signups work correctly
✅ Default names are used when not provided

## Summary

This fix ensures that signup always succeeds, even when users don't provide all optional information. The trigger now:
1. Provides intelligent defaults for required fields
2. Creates the correct primary profile based on user type
3. Handles all edge cases (multi-role, re-signup, minimal data)
4. Maintains all security and cleanup functionality

The signup flow should now be robust and error-free.
