# Company Profile Edit - "Saving..." Button Stuck

## Problem
When clicking "Save Changes" on `/company/profile/edit`, the button gets stuck on "Saving..." and doesn't save or show errors.

## Investigation Steps

### ✅ Added Detailed Logging
**File**: [company-profile-edit-form.tsx](c:\Users\sonek\OneDrive\Desktop\MAIN\openjobmarket\components\company-profile-edit-form.tsx#L312)

**Changes Made**:
1. Added console logging before update
2. Log all data being sent
3. Added `.select()` to see what was updated
4. Log detailed error information
5. Added success toast message

**Now you'll see in browser console**:
```
[COMPANY-EDIT] Starting profile update...
[COMPANY-EDIT] Profile ID: <uuid>
[COMPANY-EDIT] User ID: <uuid>
[COMPANY-EDIT] Update data: { company_name, industry, ... }
```

**If error occurs**:
```
[COMPANY-EDIT] ❌ Database error: <error>
[COMPANY-EDIT] Error details: { message, code, details, hint }
```

**If success**:
```
[COMPANY-EDIT] ✅ Profile updated successfully: <data>
[COMPANY-EDIT] Redirecting to dashboard...
```

### 🔍 Diagnostic Query Created
**File**: [supabase/diagnostics/check_company_profiles_all_columns.sql](c:\Users\sonek\OneDrive\Desktop\MAIN\openjobmarket\supabase\diagnostics\check_company_profiles_all_columns.sql)

**Run this query to check**:
1. All columns in company_profiles table
2. Which columns are missing (if any)
3. Data types for each column
4. RLS policies that might be blocking updates

## Possible Causes

### 1. Missing Database Columns
The edit form tries to update these columns:
```typescript
company_name, description, industry, services, website_url,
phone_number, location, full_address, hide_address,
hide_company_info, hide_contact_info, latitude, longitude,
logo_url, spoken_languages, service_24_7, price_list, updated_at
```

**Issue**: One or more columns might not exist in the database

**Check**: Run `check_company_profiles_all_columns.sql`

**Fix**: Add missing columns via migration

### 2. Data Type Mismatch
**Examples**:
- `services` should be `text[]` (array) but might be `text`
- `spoken_languages` should be `text[]` but might be `jsonb`
- `latitude`/`longitude` should be `double precision` but might be `text`

**Check**: Look at `data_type` and `udt_name` in diagnostic query

**Fix**: Alter column types to match

### 3. RLS Policy Blocking Update
**Issue**: Row-level security policy prevents user from updating their own profile

**Common problems**:
```sql
-- Policy might be too restrictive:
CREATE POLICY "Users can update own profile" ON company_profiles
FOR UPDATE USING (
  auth.uid() = user_id  -- ✅ Correct
);

-- vs

CREATE POLICY "Users can update own profile" ON company_profiles
FOR UPDATE USING (
  auth.uid() = id  -- ❌ Wrong - comparing to profile ID not user ID
);
```

**Check**: Look at RLS policies in diagnostic query

**Fix**: Update RLS policy

### 4. Trigger or Constraint Failure
**Issue**: Database trigger or constraint preventing update

**Examples**:
- Check constraint on `service_24_7` expects boolean
- Unique constraint on `company_name` conflicts with another company
- Foreign key constraint broken

**Check**: Look at error details in browser console

**Fix**: Adjust data or remove constraint

### 5. Missing Migration
**Issue**: Migration `20260130000002` not run yet, required fields still NOT NULL

**Check**:
```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'company_profiles'
  AND column_name IN ('company_name', 'industry', 'location');
```

**Expected**: All should show `is_nullable = 'YES'`

**Fix**: Run migration 20260130000002

## How to Debug

### Step 1: Open Browser Console
1. Open `/company/profile/edit`
2. Press F12 to open DevTools
3. Go to Console tab
4. Click "Save Changes"
5. Watch for log messages

### Step 2: Check for Errors
Look for:
```
[COMPANY-EDIT] ❌ Database error: ...
```

Common error messages:
- `column "xxx" does not exist` → Missing column
- `invalid input syntax for type xxx` → Data type mismatch
- `new row violates check constraint` → Constraint failure
- `permission denied` → RLS policy blocking update
- `null value in column "xxx" violates not-null constraint` → Required field empty

### Step 3: Run Diagnostic Query
```bash
# In Supabase Dashboard SQL Editor
# Copy and run: check_company_profiles_all_columns.sql
```

Look for:
1. Missing columns (exists = false)
2. Wrong data types
3. RLS policies that might block

### Step 4: Check Network Tab
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Click "Save Changes"
4. Look for request to Supabase API
5. Check response status and body

**Good response**: Status 200, response has data
**Bad response**: Status 400/500, error message in body

## Quick Fixes

### If Column is Missing
```sql
-- Example: Add missing column
ALTER TABLE company_profiles
ADD COLUMN spoken_languages TEXT[];

ALTER TABLE company_profiles
ADD COLUMN service_24_7 BOOLEAN DEFAULT FALSE;

ALTER TABLE company_profiles
ADD COLUMN price_list TEXT;
```

### If Data Type is Wrong
```sql
-- Example: Fix services column
ALTER TABLE company_profiles
ALTER COLUMN services TYPE TEXT[]
USING CASE
  WHEN services IS NULL THEN NULL
  ELSE string_to_array(services::TEXT, ',')
END;
```

### If RLS is Blocking
```sql
-- Check existing policy
SELECT * FROM pg_policies WHERE tablename = 'company_profiles';

-- Drop and recreate policy
DROP POLICY IF EXISTS "Users can update own profile" ON company_profiles;

CREATE POLICY "Users can update own profile" ON company_profiles
FOR UPDATE USING (
  auth.uid() = user_id
);
```

### If Migration Not Run
```bash
# Run pending migrations
supabase migration up

# Or run specific migration
supabase migration up 20260130000002
```

## Testing After Fix

### Test 1: Simple Update
1. Go to `/company/profile/edit`
2. Change company name only
3. Click "Save Changes"
4. Should see success toast and redirect

### Test 2: Full Update
1. Change multiple fields:
   - Company name
   - Industry
   - Services (add/remove)
   - Location
   - Description
2. Click "Save Changes"
3. Should save all changes

### Test 3: Optional Fields
1. Clear optional fields (website, phone)
2. Click "Save Changes"
3. Should save with NULL values

## Expected Browser Console Output

### Success Case
```
[COMPANY-EDIT] Starting profile update...
[COMPANY-EDIT] Profile ID: 12345...
[COMPANY-EDIT] User ID: 67890...
[COMPANY-EDIT] Update data: {
  company_name: "Test Company",
  industry: "Technology",
  location: "London, UK",
  services_count: 2,
  has_description: true,
  has_website: true,
  has_phone: true
}
[COMPANY-EDIT] ✅ Profile updated successfully: [{ id: "...", company_name: "Test Company", ... }]
[COMPANY-EDIT] Redirecting to dashboard...
```

### Error Case (Example)
```
[COMPANY-EDIT] Starting profile update...
[COMPANY-EDIT] Profile ID: 12345...
[COMPANY-EDIT] User ID: 67890...
[COMPANY-EDIT] Update data: { ... }
[COMPANY-EDIT] ❌ Database error: Error { message: "column 'spoken_languages' does not exist" }
[COMPANY-EDIT] Error details: {
  message: "column 'spoken_languages' does not exist",
  code: "42703",
  details: null,
  hint: null
}
[COMPANY-EDIT] ❌ Unexpected error: Error: column 'spoken_languages' does not exist
```

## Next Steps

1. **Open browser console** and try to save
2. **Copy the error message** from console
3. **Run diagnostic query** to check columns
4. **Share the error** so we can fix it

---

**Status**: Debugging enabled, awaiting error details from browser console
**Priority**: HIGH - Blocks profile editing
