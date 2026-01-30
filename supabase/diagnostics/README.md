# Signup Diagnostics - SQL Queries

These SQL files help you debug signup issues and verify what data is being created.

## Files

### 1. `verify_signup_data.sql`
**Purpose**: Comprehensive diagnostics to check signup data across all tables

**Use Cases**:
- Check if users are being created in `auth.users`
- Verify if profiles are being created
- Find orphaned users (users without profiles)
- See what metadata was saved during signup
- Check recent signup attempts

**How to Use**:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy/paste queries from this file
4. Run them one by one or all together

### 2. `required_signup_fields.sql`
**Purpose**: Shows exactly what fields are REQUIRED vs OPTIONAL for signup

**Use Cases**:
- Understand minimum data needed for signup
- Check which fields have defaults
- Identify why signup might be failing (missing required fields)

**How to Use**:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the queries to see required fields for each profile type

## Quick Debugging Steps

### If Signup is Failing:

1. **Check Browser Console**:
   ```
   [SIGNUP] Validating signup data...
   [SIGNUP] Metadata prepared: { ... }
   [SIGNUP] Calling supabase.auth.signUp...
   [SIGNUP] Response: { user: "xxx", error: null }
   ```

   If you see an error, note the message.

2. **Run Query #1** from `verify_signup_data.sql`:
   ```sql
   SELECT id, email, created_at, raw_user_meta_data
   FROM auth.users
   ORDER BY created_at DESC
   LIMIT 10;
   ```

   - If user appears here → Signup succeeded, check profile creation
   - If user doesn't appear → Signup failed at auth level

3. **Run Query #2** to check if user record was created:
   ```sql
   SELECT id, email, user_type, account_type
   FROM public.users
   ORDER BY created_at DESC
   LIMIT 10;
   ```

   - If user appears → Database trigger worked
   - If missing → Trigger failed or doesn't exist

4. **Run Query #5** to find orphaned users:
   ```sql
   -- Shows users in auth but not in public.users
   SELECT au.id, au.email, au.created_at
   FROM auth.users au
   LEFT JOIN public.users pu ON au.id = pu.id
   WHERE pu.id IS NULL;
   ```

5. **Run Query #8** with specific email to test:
   ```sql
   -- Replace email in the query
   DO $$
   DECLARE
     v_email TEXT := 'test@example.com'; -- YOUR EMAIL HERE
     ...
   ```

### If Verification is Hanging:

✅ **FIXED** - This was already resolved by simplifying the verification flow.

Verification now just verifies email and redirects to dashboard without creating profiles.

### If User Can't Access Dashboard:

Check if profile exists:
```sql
SELECT
  u.id,
  u.email,
  u.user_type,
  EXISTS(SELECT 1 FROM professional_profiles WHERE user_id = u.id) as has_prof_profile,
  EXISTS(SELECT 1 FROM company_profiles WHERE user_id = u.id) as has_company_profile
FROM public.users u
WHERE email = 'user@example.com';
```

## Common Issues & Solutions

### Issue: "User already registered"
**Cause**: Email already exists in `auth.users`

**Solution**:
```sql
-- Check if user exists
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'user@example.com';

-- If unconfirmed, you can delete (CAUTION):
-- DELETE FROM auth.users WHERE email = 'user@example.com' AND email_confirmed_at IS NULL;
```

### Issue: User exists but no profile
**Cause**: Profile creation failed or trigger doesn't exist

**Solution**:
1. Check triggers exist:
   ```sql
   SELECT trigger_name, event_object_table
   FROM information_schema.triggers
   WHERE event_object_schema = 'auth';
   ```

2. Manually create profile if needed (temporary fix):
   ```sql
   -- For professional
   INSERT INTO professional_profiles (user_id, first_name, last_name)
   SELECT id, 'User', 'Name'
   FROM auth.users
   WHERE email = 'user@example.com';
   ```

### Issue: Missing required field error
**Cause**: Profile table requires fields that aren't provided

**Solution**:
1. Run `required_signup_fields.sql` to see what's required
2. Either:
   - Update signup to provide the data
   - OR make the column nullable:
     ```sql
     ALTER TABLE professional_profiles
     ALTER COLUMN some_field DROP NOT NULL;
     ```

## Expected Data Flow

```
1. User fills signup form
   ↓
2. Frontend calls supabase.auth.signUp({
     email, password,
     options: { data: { user_type, account_type, ... } }
   })
   ↓
3. Supabase creates record in auth.users
   ↓
4. Database trigger fires (should create public.users record)
   ↓
5. Email sent with verification code
   ↓
6. User enters code → Email verified
   ↓
7. Redirect to /dashboard
   ↓
8. Dashboard checks if profile exists
   ↓
9. If no profile OR onboarding_completed = false:
   Show onboarding wizard
   ↓
10. User completes profile → onboarding_completed = true
```

## Migration Status Check

Check if onboarding_completed column exists:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('professional_profiles', 'company_profiles', 'contractor_profiles', 'homeowner_profiles')
  AND column_name = 'onboarding_completed'
  AND table_schema = 'public';
```

If missing, run migration:
```sql
-- From: 20260130000001_add_onboarding_completed_flag.sql
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;
-- ... (repeat for other tables)
```

## Support

If you're still stuck after running these queries:

1. Share the output of Query #1, #2, and #5
2. Share the browser console error
3. Share what step fails (signup, verification, or profile creation)
