# Company Profile Setup - Critical Fixes

## The Problems

### 1. **Redundant Setup Page**
- User fills out company_name, industry, location during signup (Step 3)
- Data saved in `auth.users.raw_user_meta_data`
- After email verification → **NO profile created**
- User redirected to `/dashboard/company/setup`
- **Asked to re-enter ALL the same data again!**
- Setup page has NO map/geocoding (unlike signup)

### 2. **Button Stuck on "Creating Profile"**
- CompanySetupForm tries to insert record
- Migration `20260130000002` not run yet → fields still REQUIRED in database
- Insert fails due to missing required fields or constraints
- No error logging → silent failure
- Button stays in loading state forever

### 3. **Wrong Data Flow**
```
Current (BROKEN):
Signup (collect data) → Save metadata → Verify email → Redirect to dashboard
→ Check profile exists → NO → Redirect to home → ??? → End up at /setup
→ Re-enter data → Submit → STUCK

Should be:
Signup (collect data) → Save metadata → Verify email → Redirect to dashboard
→ Auto-create profile from metadata → Dashboard shows with onboarding prompt
→ Complete remaining fields (description, services, etc.)
```

## The Solutions

### ✅ Fix 1: Auto-Create Company Profiles from Metadata

**File**: `supabase/migrations/20260130000004_create_company_profile_from_metadata.sql`

**What it does**:
1. Creates trigger function `create_company_profile_from_metadata()`
2. Trigger fires AFTER INSERT on `public.users`
3. Checks if `user_type = 'company'`
4. Extracts metadata: company_name, industry, location, latitude, longitude, phone
5. Creates `company_profiles` record with:
   - Data from metadata
   - `onboarding_completed = FALSE` (to prompt for remaining fields)
   - Defaults for missing data (company_name = 'Company', industry = 'General')
6. Backfills existing users without profiles

**Benefits**:
- User never has to re-enter signup data
- Profile exists immediately after signup
- Dashboard can show onboarding modal for completing description, services, etc.
- Location data with coordinates preserved from signup

### ✅ Fix 2: Improve CompanySetupForm Error Handling

**File**: `components/company-setup-form.tsx`

**Changes**:
1. Added detailed console logging:
   ```typescript
   console.log("[COMPANY-SETUP] Starting form submission...")
   console.log("[COMPANY-SETUP] Form data:", {...})
   console.error("[COMPANY-SETUP] Database error:", error)
   ```

2. Removed manual timestamp handling:
   ```typescript
   // BEFORE:
   created_at: new Date().toISOString(),
   updated_at: new Date().toISOString(),

   // AFTER:
   // Let database defaults handle it
   ```

3. Added `onboarding_completed: true` when user fills setup form

4. Enhanced error details in console:
   ```typescript
   console.error("[COMPANY-SETUP] Error details:", {
     message: error.message,
     code: error.code,
     details: error.details,
     hint: error.hint,
   })
   ```

**Benefits**:
- Can see exact error in browser console
- Won't conflict with database defaults
- Proper onboarding state tracking

### ✅ Fix 3: Make Company Profile Fields Optional

**Already done in**: `supabase/migrations/20260130000002_fix_required_fields_and_add_onboarding.sql`

Lines 47-58:
```sql
ALTER TABLE public.company_profiles
ALTER COLUMN company_name DROP NOT NULL,
ALTER COLUMN industry DROP NOT NULL,
ALTER COLUMN location DROP NOT NULL;
```

**Benefits**:
- Minimal data signup works
- Profile creation doesn't fail on missing fields
- Onboarding can collect remaining data

## Migration Order

Run migrations in this order:

```bash
# 1. Make fields optional and add onboarding_completed flag
supabase migration up 20260130000002

# 2. Auto-create company profiles from metadata
supabase migration up 20260130000004
```

OR run them via Supabase Dashboard:
1. Open SQL Editor
2. Copy/paste migration 20260130000002
3. Run
4. Copy/paste migration 20260130000004
5. Run

## Testing After Fix

### Test 1: New User Signup
1. Sign up as company user (Fill Step 1-3)
2. Enter company_name, industry, location in Step 3
3. Verify email with OTP code
4. Should redirect to `/dashboard/company`
5. ✅ **Company profile should exist** (created from metadata)
6. Dashboard shows onboarding prompt if description/services missing

### Test 2: Existing User (khomiuk89@gmail.com)
1. Run migration 20260130000004
2. Backfill will create profile from metadata automatically
3. Refresh `/dashboard/company`
4. ✅ Should see dashboard (no longer redirected to setup)

### Test 3: Setup Page (if still needed)
1. Manually navigate to `/dashboard/company/setup`
2. Fill form and submit
3. Check browser console
4. Should see:
   ```
   [COMPANY-SETUP] Starting form submission...
   [COMPANY-SETUP] Form data: {...}
   [COMPANY-SETUP] Inserting profile: {...}
   [COMPANY-SETUP] ✅ Profile created successfully: <id>
   ```
5. Redirects to `/dashboard/company`

## What Happens to /setup Page?

The `/dashboard/company/setup` page can:
1. **Be removed entirely** - No longer needed since profiles auto-created
2. **Be kept as fallback** - For edge cases or manual profile creation
3. **Be used for onboarding** - Repurpose to collect description, services, etc.

Recommended: **Remove or repurpose as onboarding**

## Data Collected During Signup (Step 3)

For company users, signup already collects:
- ✅ company_name (required)
- ✅ industry (required)
- ✅ location (required)
- ✅ latitude/longitude (from geocoding)
- ✅ phone (optional)

Still needed (can collect in onboarding):
- ⚪ description (company description)
- ⚪ services (what the company offers)
- ⚪ website_url
- ⚪ logo

## Recommended Next Steps

1. ✅ Run migration 20260130000002 (make fields optional)
2. ✅ Run migration 20260130000004 (auto-create profiles)
3. ✅ Test signup flow end-to-end
4. 🔨 Implement onboarding modal in company dashboard to collect:
   - description
   - services
   - website
   - logo
5. 🔨 Remove or repurpose `/dashboard/company/setup` page
6. 🔨 Update `/dashboard/company` to check `onboarding_completed` flag

## Verification Queries

Check if profile was created for khomiuk89@gmail.com:

```sql
-- Check auth user and metadata
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE email = 'khomiuk89@gmail.com';

-- Check if public.users record exists
SELECT id, user_type, account_type
FROM public.users
WHERE email = 'khomiuk89@gmail.com';

-- Check if company profile exists
SELECT cp.*, u.email
FROM company_profiles cp
JOIN users u ON u.id = cp.user_id
WHERE u.email = 'khomiuk89@gmail.com';
```

If profile missing after migration, manually create:
```sql
-- Get user ID
SELECT id FROM auth.users WHERE email = 'khomiuk89@gmail.com';

-- Manually trigger function (replace <user_id>)
SELECT create_company_profile_from_metadata()
FROM public.users WHERE id = '<user_id>';
```

---

**Status**: Ready to deploy
**Priority**: CRITICAL - Blocks all company signups
