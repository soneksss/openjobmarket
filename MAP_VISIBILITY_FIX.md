# Map Visibility Fix - Companies & Tradespeople Not Showing

**Date**: 2026-01-20
**Issue**: Registered companies and tradespeople not visible on the map

---

## Root Cause

The map search queries filter profiles by columns that don't exist in `professional_profiles` and `company_profiles` tables:
- `professional_profiles.profile_visible` ❌ Doesn't exist
- `professional_profiles.available_for_work` ❌ Doesn't exist
- `company_profiles.open_for_business` ❌ Doesn't exist

**Result**: Queries return 0 results even though profiles exist in database.

---

## Solution

### Step 1: Apply Migration

Run the migration file that adds these columns:

**File**: `supabase/migrations/20260120000001_add_visibility_columns_to_profiles.sql`

**How to Run**:

#### Option A: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://app.supabase.com/project/mklxzrvhanlndkyeteog)
2. Click **SQL Editor** in sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20260120000001_add_visibility_columns_to_profiles.sql`
5. Paste into the SQL editor
6. Click **Run**
7. Check the output for verification notices

#### Option B: Command Line (if using local Supabase)
```bash
# If you have Supabase CLI installed and Docker running
npx supabase migration up
```

### Step 2: Verify Migration Success

After running the migration, you should see output like:
```
========================================
Profile Visibility Migration Complete
========================================
Professionals visible: 15
Professionals available for work: 15
Professionals with coordinates: 0  ⚠️ WARNING
----------------------------------------
Companies open for business: 8
Companies with coordinates: 0  ⚠️ WARNING
========================================
```

**If you see "0 with coordinates"**, profiles exist but have NO latitude/longitude set!

---

## Fix Coordinates Issue

If the migration shows "0 with coordinates", users need to add location to their profiles.

### For Testing (Quick Fix)

Run this SQL to add example coordinates to existing profiles:

```sql
-- Update professionals with London coordinates (for testing)
UPDATE professional_profiles
SET latitude = 51.5074, longitude = -0.1278
WHERE latitude IS NULL OR longitude IS NULL;

-- Update companies with London coordinates (for testing)
UPDATE company_profiles
SET latitude = 51.5074, longitude = -0.1278
WHERE latitude IS NULL OR longitude IS NULL;
```

**NOTE**: This gives everyone the same London coordinates. For real data, users should set their actual location in profile settings.

### For Production (Proper Fix)

Users must set their location in:
- **Professionals**: Profile Settings → Location → Search for address → Save
- **Companies**: Company Profile → Location → Enter full address → Save

This will populate `latitude` and `longitude` automatically via geocoding.

---

## Testing

### Test 1: Check Database

Run this SQL query to verify data:

```sql
-- Check professionals
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN profile_visible THEN 1 END) as visible,
  COUNT(CASE WHEN available_for_work THEN 1 END) as available,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coords,
  COUNT(CASE WHEN profile_visible AND available_for_work
            AND latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as should_show_on_map
FROM professional_profiles;

-- Check companies
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN open_for_business THEN 1 END) as open,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coords,
  COUNT(CASE WHEN open_for_business
            AND latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as should_show_on_map
FROM company_profiles;
```

**Expected**: `should_show_on_map` should match the number you see on the map.

### Test 2: Check Map Display

1. Go to `http://localhost:3005`
2. Click search tabs: **Traders** or **Talents**
3. Should now see professionals/companies on map (if they have coordinates)
4. Check browser console:
   ```
   [PROFESSIONALS-PAGE] Data received: Array(15)  ✅ Should be > 0
   [PROFESSIONALS-PAGE] Data with coordinates: 15 out of 15  ✅
   [v0] ProfessionalMap rendering with 15 professionals  ✅
   ```

---

## What the Migration Does

### Adds Columns

**To `professional_profiles`**:
- `profile_visible BOOLEAN DEFAULT true` - Shows profile on map/search
- `available_for_work BOOLEAN DEFAULT true` - Shows as available

**To `company_profiles`**:
- `open_for_business BOOLEAN DEFAULT true` - Shows company on map/search

### Sets Defaults

- All existing profiles set to `visible = true`, `available = true`, `open = true`
- New profiles default to visible/available/open

### Creates Indexes

- Optimizes queries that filter by visibility flags
- Improves map loading performance

---

## Files Modified

### New Files
1. `supabase/migrations/20260120000001_add_visibility_columns_to_profiles.sql` - Migration
2. `MAP_VISIBILITY_FIX.md` - This documentation

### Existing Files (No Changes Required)
- `components/main-page-search.tsx` - Query already correct, just needed columns to exist
- `components/professionals-page-content.tsx` - Already filters by coordinates correctly

---

## Rollback (If Needed)

If you need to undo this migration:

```sql
-- Remove columns
ALTER TABLE professional_profiles
DROP COLUMN IF EXISTS profile_visible,
DROP COLUMN IF EXISTS available_for_work;

ALTER TABLE company_profiles
DROP COLUMN IF EXISTS open_for_business;

-- Drop indexes
DROP INDEX IF EXISTS idx_professional_profiles_visibility;
DROP INDEX IF EXISTS idx_company_profiles_business_status;
```

---

## Summary

✅ **Root Cause**: Missing columns in profile tables
✅ **Solution**: Add `profile_visible`, `available_for_work`, `open_for_business` columns
✅ **Additional Issue**: Profiles need latitude/longitude to show on map
✅ **Quick Fix**: Run test SQL to add example coordinates
✅ **Proper Fix**: Users set location in profile settings

After applying the migration, professionals and companies will appear on the map (if they have coordinates set).
