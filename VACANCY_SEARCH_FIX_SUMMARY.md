# Vacancy Search Fix - Summary

## Problem Identified

**Vacancies were returning 0 results despite existing in the database due to TWO location filters excluding jobs without coordinates:**

1. ❌ **Database-level filter** (lines 1056-1073) - Applied geospatial bounding box filter that excluded ALL jobs without lat/lon
2. ❌ **Client-side filter** (line 1098) - `.filter(item => item.latitude && item.longitude)` removed jobs before display

## Fixes Applied

### Fix 1: Removed Database-Level Location Filter
**File:** `components/main-page-search.tsx` (lines 1056-1058)

**Before:**
```typescript
if (selectedLocation) {
  query = query
    .gte("latitude", lat - latDelta)
    .lte("latitude", lat + latDelta)
    .gte("longitude", lon - lngDelta)
    .lte("longitude", lon + lngDelta)
}
```

**After:**
```typescript
// NOTE: Location filtering is done client-side after fetching results
// to avoid excluding jobs without coordinates (which is common for vacancies)
// Database-level filtering would exclude ALL jobs missing lat/lon values
```

**Reason:** Supabase query operators like `.gte()` and `.lte()` automatically exclude NULL values, so jobs without coordinates were completely filtered out.

### Fix 2: Removed Client-Side Coordinate Filter
**File:** `components/main-page-search.tsx` (line 1098 → 1104)

**Before:**
```typescript
results = data
  .filter(item => item.latitude && item.longitude)  // ❌ Excludes jobs without coords
  .map((job: any) => { ... })
```

**After:**
```typescript
// IMPORTANT: Do NOT filter out jobs without coordinates - they should still appear in search results
results = data.map((job: any) => { ... })
```

**Reason:** Jobs without coordinates should still appear in search results. They can be shown in list view even if they don't appear on the map.

### Fix 3: Added Debug Logging

Added comprehensive logging to track:
- Query parameters (type, filters, search terms)
- Result counts (total, with coords, without coords)
- Sample job data from first result
- Coordinate statistics

**Example output:**
```
[MAIN-PAGE-SEARCH] ===== EXECUTING VACANCY/JOB QUERY =====
[MAIN-PAGE-SEARCH] Query parameters: {...}
[MAIN-PAGE-SEARCH] Query completed. Data count: 5
[MAIN-PAGE-SEARCH] Sample job data (first result): {...}
[MAIN-PAGE-SEARCH] Jobs with coordinates: 3, without coordinates: 2
[MAIN-PAGE-SEARCH] Enriched 5 jobs with poster data (including 2 without coordinates)
```

## Current Behavior (After Fix)

✅ **Vacancies WITHOUT coordinates:**
- Appear in search results
- Show in list view
- Do NOT appear on map (expected)

✅ **Vacancies WITH coordinates:**
- Appear in search results
- Show in list view
- Show on map with clickable pins

## Testing Instructions

### 1. Run Diagnostic SQL
Execute `DIAGNOSE_VACANCY_SEARCH.sql` in Supabase SQL Editor to verify:
- Total vacancy count
- How many have coordinates
- Sample plumber vacancy data
- Company "Remus" jobs status

### 2. Test Vacancy Search
1. Open browser as a Jobseeker
2. Search for "Plumber" in **Vacancies** tab
3. Check console logs for:
   ```
   [MAIN-PAGE-SEARCH] Query completed. Data count: X
   [MAIN-PAGE-SEARCH] Jobs with coordinates: Y, without coordinates: Z
   ```
4. Verify results appear in the UI

### 3. Verify Expected Results

**If vacancies exist and have coordinates:**
- Should see `Data count: X` where X > 0
- Should see jobs in both map and list view

**If vacancies exist but DON'T have coordinates:**
- Should see `Data count: X` where X > 0
- Should see jobs in LIST view only
- Console should show: "without coordinates: X"

**If no vacancies exist:**
- Should see `Data count: 0`
- Need to create test vacancies via company dashboard

## Potential Issues (If Still 0 Results)

If search still returns 0 results after this fix, check:

### 1. Job Status Issues
```sql
-- Check if jobs have wrong status
SELECT status, COUNT(*) FROM jobs WHERE is_tradespeople_job = FALSE GROUP BY status;
```
**Fix:** Ensure status = 'open', not 'accepted', 'completed', etc.

### 2. is_active Flag
```sql
-- Check if jobs are marked inactive
SELECT is_active, COUNT(*) FROM jobs WHERE is_tradespeople_job = FALSE GROUP BY is_active;
```
**Fix:** Ensure is_active = TRUE

### 3. Expiration Issues
```sql
-- Check if jobs are expired
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END) as expired
FROM jobs WHERE is_tradespeople_job = FALSE;
```
**Fix:** Check expiration dates, may need to extend expired jobs

### 4. is_tradespeople_job Flag Mismatch
```sql
-- Verify flag is set correctly
SELECT is_tradespeople_job, COUNT(*) FROM jobs GROUP BY is_tradespeople_job;
```
**Fix:** If vacancies have `is_tradespeople_job = TRUE`, they won't appear in vacancy search

### 5. RLS Policies Blocking Access
```sql
-- Check if RLS is blocking read access
SHOW rls ON jobs;
SELECT * FROM jobs LIMIT 1; -- As anonymous user
```
**Fix:** Ensure RLS allows public read of active jobs

## Map vs List View Behavior

**Important Design Decision:**
- Jobs WITHOUT coordinates: Show in LIST ONLY
- Jobs WITH coordinates: Show in BOTH list AND map

**Why this approach:**
1. Prevents excluding valid jobs just because they lack GPS coordinates
2. Employers may post jobs without precise location (e.g., "Remote" or "Central London")
3. Map is supplementary feature, not primary search method

## Files Modified

1. `components/main-page-search.tsx`
   - Line 1056-1058: Removed database geospatial filter
   - Line 1098-1104: Removed client-side coordinate filter
   - Lines 1086-1123: Added comprehensive debug logging

## Next Steps

1. **Test the fix:**
   - Run diagnostic SQL queries
   - Search for "Plumber" as jobseeker
   - Check console logs for result counts

2. **If still 0 results:**
   - Review console logs for query parameters
   - Check diagnostic SQL output
   - Investigate job status/flags in database

3. **Future Enhancement:**
   - Consider adding "Show on map" checkbox for employers
   - Add geocoding service to auto-populate coordinates
   - Show distance sorting only for jobs with coordinates

## Database Schema Reminder

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',  -- 'open', 'accepted', 'in_progress', 'completed', 'failed'
  is_active BOOLEAN DEFAULT TRUE,
  is_tradespeople_job BOOLEAN DEFAULT FALSE,  -- FALSE = vacancy, TRUE = trade job
  latitude DECIMAL(10, 8),  -- Can be NULL
  longitude DECIMAL(11, 8),  -- Can be NULL
  location TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID REFERENCES company_profiles(id)
);
```

## Success Criteria

✅ Jobseeker searching "Plumber" in Vacancies tab sees results
✅ Jobs with coordinates appear on map
✅ Jobs without coordinates appear in list
✅ Console logs show data count > 0
✅ No TypeScript or runtime errors
✅ Company dashboard still shows jobs correctly (no regression)
