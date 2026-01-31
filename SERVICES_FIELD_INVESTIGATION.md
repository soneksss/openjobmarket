# Services Field Investigation

## Problem
User (khomiuk89@gmail.com) created account and mentioned services during signup, but services don't appear in edit profile page.

## Root Cause
✅ **FOUND**: The trigger function `create_company_profile_from_metadata()` was NOT extracting services from signup metadata.

## What Happens During Signup

### Services Collection
Services are ONLY shown during signup if user has **"tradespeople" role** selected.

**Step 2**: User selects roles
- ☐ Job Seeker
- ☐ Homeowner
- ☐ Employer
- ☐ Tradespeople

**Step 3**: If "Tradespeople" is selected:
- Services input appears (REQUIRED for tradespeople)
- User can add multiple services: "Plumbing", "Electrical", etc.
- Saved to metadata as: `metadata.services = ["Plumbing", "Electrical"]`
- Also saves first service as: `metadata.trade = "Plumbing"`

### Validation
```typescript
// Trade is required for Tradespeople (line 266)
if (signupData.roles.tradespeople && (!signupData.services || signupData.services.length === 0)) {
  setError('Please enter your trade or service')
  return false
}
```

### Data Flow (Before Fix)
```
1. Signup → services entered → Saved to metadata ✅
2. Email verification ✅
3. Trigger creates company_profiles → services NOT extracted ❌
4. Edit profile → services field empty ❌
```

### Data Flow (After Fix)
```
1. Signup → services entered → Saved to metadata ✅
2. Email verification ✅
3. Trigger creates company_profiles → services extracted from metadata ✅
4. Edit profile → services field populated ✅
```

## Why Services Are Important

### Used in Edit Profile Form
Lines 567-593 of `company-profile-edit-form.tsx`:
```typescript
{/* Services */}
<div className="space-y-2">
  <Label className="text-sm font-medium">Services</Label>
  <div className="flex gap-2">
    <Input
      placeholder="Add a service (e.g., Lightning design, Electrical installation)"
      value={newService}
      onChange={(e) => setNewService(e.target.value)}
      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
    />
    <Button type="button" onClick={addService} size="icon">
      <Plus className="h-4 w-4" />
    </Button>
  </div>
  <p className="text-xs text-muted-foreground">
    List the services your company provides (helps customers find you by service type)
  </p>
</div>
```

### Helps Customers Find Companies
- Services are searchable
- Displayed on company profile
- Used for matching jobs

## The Fix

### Updated Migration File
`supabase/migrations/20260130000004_create_company_profile_from_metadata.sql`

**Added**:
1. Extract services from metadata:
   ```sql
   v_services := v_metadata->'services'; -- Extract services as JSONB array
   ```

2. Save to company_profiles:
   ```sql
   services,  -- Added to column list
   CASE
     WHEN v_services IS NOT NULL AND jsonb_array_length(v_services) > 0
     THEN (SELECT jsonb_agg(value) FROM jsonb_array_elements_text(v_services) WHERE value != '')
     ELSE NULL
   END, -- Convert JSONB array to text array, filtering empty strings
   ```

3. Applied to both:
   - Trigger function (for new signups)
   - Backfill block (for existing users like khomiuk89@gmail.com)

## Should Services Stay in Signup?

### Current Behavior
- **Employer-only users**: NO services field (makes sense - they post jobs, don't provide services)
- **Tradespeople users**: YES services field (REQUIRED - makes sense, they provide services)
- **Employer + Tradespeople users**: YES services field (makes sense - they both post jobs AND provide services)

### Arguments FOR Keeping Services in Signup
✅ Only shown to relevant users (tradespeople role)
✅ Already validated as required for tradespeople
✅ Helps complete profile immediately
✅ Better UX - collect data once, not in multiple steps
✅ Services help with matching and discoverability

### Arguments FOR Removing Services from Signup
❌ Makes signup longer
❌ Could be collected in onboarding instead
❌ Not all company users need it (only those with tradespeople role)

## Recommendation

**KEEP services in signup** for these reasons:
1. It's contextual - only shown when relevant (tradespeople role)
2. It's already optional for company-only users
3. Collecting it during signup provides better immediate profile completion
4. Users with tradespeople role EXPECT to provide this info
5. Services are critical for searchability and matching

**Alternative**: If you want to simplify signup:
- Make services optional even for tradespeople during signup
- Show onboarding wizard after verification to collect services
- But this adds an extra step and worse UX

## What User Needs to Do

1. **Run migration 20260130000004**:
   ```bash
   supabase migration up 20260130000004
   ```

   OR in Supabase Dashboard SQL Editor:
   ```sql
   -- Copy/paste entire content of migration file
   ```

2. **Verify backfill worked**:
   ```sql
   SELECT
     cp.company_name,
     cp.services,
     au.raw_user_meta_data->'services' as metadata_services
   FROM company_profiles cp
   JOIN users u ON u.id = cp.user_id
   JOIN auth.users au ON au.id = u.id
   WHERE u.email = 'khomiuk89@gmail.com';
   ```

3. **Test edit profile**:
   - Go to `/company/profile/edit`
   - Services should now appear if they were provided during signup

## Decision Needed

**Question**: Do you want to keep services in signup or remove it?

**Option A - Keep it (Recommended)**:
- ✅ No changes needed
- ✅ Just run the migration
- ✅ Services will be saved from signup

**Option B - Remove from signup**:
- ❌ Need to modify `multi-step-signup.tsx`
- ❌ Need to create onboarding wizard
- ❌ More work for same result
- ❌ Worse UX (extra step)

---

**Status**: Fix ready, pending migration run
**Recommendation**: Keep services in signup, just run the migration
