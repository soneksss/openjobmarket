# 🚨 CRITICAL SIGNUP FIX - RUN THIS MIGRATION NOW

## The Problem

Your signup is failing because profile tables have **REQUIRED fields** that aren't provided during signup:

```
homeowner_profiles:
  ⚠️ first_name - REQUIRED (but not provided)
  ⚠️ last_name - REQUIRED (but not provided)
  ⚠️ location - REQUIRED (but not provided)

professional_profiles:
  ⚠️ first_name - REQUIRED
  ⚠️ last_name - REQUIRED
  ⚠️ title - REQUIRED
  ⚠️ location - REQUIRED

company_profiles:
  ⚠️ company_name - REQUIRED
  ⚠️ industry - REQUIRED
  ⚠️ location - REQUIRED
```

When a user signs up without these fields → **Profile creation fails** → **Signup fails**

## The Solution

Run this migration to make all fields **OPTIONAL**:

**File**: `supabase/migrations/20260130000002_fix_required_fields_and_add_onboarding.sql`

This migration does 3 things:
1. ✅ Adds `onboarding_completed` flag
2. ✅ Makes all fields NULLABLE (optional)
3. ✅ Sets sensible defaults for existing empty data

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the entire content of `20260130000002_fix_required_fields_and_add_onboarding.sql`
4. Paste and click **Run**
5. ✅ Should see: "Success. No rows returned"

### Option 2: Supabase CLI

```bash
supabase migration up
```

## After Migration

### Test Signup:

1. Clear browser cache / use incognito
2. Go to signup page
3. Fill in **MINIMAL info**:
   - Email
   - Password (min 6 chars)
   - Account type
   - One role selected
4. Click signup
5. Enter verification code
6. ✅ Should work!

### Verify Migration Worked:

Run this in SQL Editor:
```sql
-- Should show all as OPTIONAL now
SELECT
  table_name,
  column_name,
  is_nullable,
  CASE WHEN is_nullable = 'YES' THEN '✓ OPTIONAL' ELSE '⚠️ REQUIRED' END
FROM information_schema.columns
WHERE table_name IN ('professional_profiles', 'company_profiles', 'homeowner_profiles')
  AND column_name IN ('first_name', 'last_name', 'location', 'company_name')
ORDER BY table_name, column_name;
```

Expected output:
```
professional_profiles | first_name | YES | ✓ OPTIONAL
professional_profiles | last_name  | YES | ✓ OPTIONAL
professional_profiles | location   | YES | ✓ OPTIONAL
company_profiles      | company_name | YES | ✓ OPTIONAL
...
```

## What This Changes

### Before Migration:
```
Signup → Try to create profile → MISSING REQUIRED FIELDS → ERROR → Signup fails
```

### After Migration:
```
Signup → Create minimal profile → Success → Redirect to dashboard → Onboarding wizard collects remaining data
```

## Minimal Signup Now Works With:

```javascript
{
  email: "user@example.com",
  password: "password123",
  options: {
    data: {
      user_type: "professional",  // Required
      account_type: "individual"  // Required
      // EVERYTHING ELSE IS NOW OPTIONAL!
    }
  }
}
```

## Data Flow After Fix

```
1. User fills signup form (Step 1-3)
   ↓
2. Signup creates auth.users ✅
   ↓
3. Trigger creates public.users ✅
   ↓
4. Email sent ✅
   ↓
5. User verifies email ✅
   ↓
6. Redirect to /dashboard ✅
   ↓
7. Dashboard checks: onboarding_completed?
   ↓
8. If FALSE → Show onboarding wizard
   ↓
9. Collect remaining data (name, location, etc.)
   ↓
10. Mark onboarding_completed = TRUE
   ↓
11. Show normal dashboard ✅
```

## Rollback (if needed)

If something goes wrong, you can rollback:

```sql
-- Make fields required again (NOT recommended)
ALTER TABLE public.professional_profiles
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Remove onboarding_completed
ALTER TABLE public.professional_profiles
DROP COLUMN onboarding_completed;
```

## Next Steps After Migration

1. ✅ Run migration
2. ✅ Test signup works
3. 🔨 Implement onboarding wizard in dashboard (see REGISTRATION_FIX_SUMMARY.md)
4. 🔨 Update dashboard to check onboarding_completed flag
5. 🔨 Collect remaining profile data during onboarding

---

**⚠️ IMPORTANT**: Run this migration ASAP - signup is completely broken without it!
