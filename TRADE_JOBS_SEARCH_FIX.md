# Trade Jobs Search Fix - Query Timeout Issue

## Problem

When jobseekers try to search for Trade Jobs, the website gets stuck on "Searching..." and never completes. The query logs show:

```
[MAIN-PAGE-SEARCH] Applying search filter: Plumber
[MAIN-PAGE-SEARCH] Search terms after splitting: ['Plumber']
[MAIN-PAGE-SEARCH] ===== EXECUTING VACANCY/JOB QUERY =====
[MAIN-PAGE-SEARCH] Query parameters: {type: 'jobs_tasks', is_tradespeople_job: true, ...}
[MAIN-PAGE-SEARCH] isSearching state changed to: true
```

The "Query completed" log never appears, indicating the query is hanging.

---

## Root Cause (Suspected)

The Trade Jobs query is hanging due to one or more of these issues:

1. **RLS (Row Level Security) Policy** - The `homeowner_profiles` table may have RLS enabled that blocks anonymous/public read access, causing the LEFT JOIN to hang
2. **Missing Columns** - Trade Job filters reference columns (`category`, `urgency`, `budget_min`, `budget_max`) that may not exist in the `jobs` table
3. **Foreign Key Issue** - The join between `jobs` and `homeowner_profiles` may have a constraint issue
4. **Query Complexity** - The combined filters and joins may be too complex and causing a timeout

---

## Fixes Applied

### Fix 1: Added Query Timeout Protection
**File**: `components/main-page-search.tsx` (lines 1109-1120)

Added 10-second timeout to prevent infinite waiting:

```typescript
// Add timeout protection to prevent infinite waiting
const queryPromise = query.limit(RESULT_LIMIT + 1)
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
)

console.log(`[MAIN-PAGE-SEARCH] Executing query with 10s timeout...`)
const { data, error } = await Promise.race([queryPromise, timeoutPromise])
  .catch((err) => {
    console.error(`[MAIN-PAGE-SEARCH] Query failed:`, err)
    return { data: null, error: err }
  }) as any
```

**Why**: This ensures the UI doesn't hang forever. After 10 seconds, the query will timeout and show an error message to the user.

### Fix 2: Improved Error Handling
**File**: `components/main-page-search.tsx` (lines 1138-1147)

Added user-friendly error messages:

```typescript
if (error) {
  console.error(`[MAIN-PAGE-SEARCH] Query error:`, error)
  // Show error message to user
  if (error.message?.includes('timeout')) {
    alert(t('mainSearch.searchTimeout') || 'Search timed out. Please try again or adjust your filters.')
  } else {
    alert(t('mainSearch.searchFailed') || 'Search failed. Please try again.')
  }
  return
}
```

**Why**: Users now see a clear message instead of an infinite loading state.

### Fix 3: Enhanced Data Enrichment
**File**: `components/main-page-search.tsx` (lines 1157-1179)

Improved handling of both company and homeowner profiles:

```typescript
results = data.map((job: any) => {
  const homeownerProfile = job.homeowner_profiles
  const companyProfile = job.company_profiles

  // For Trade Jobs, poster could be homeowner OR company
  // For Vacancies, poster is always company
  const isTradeJob = job.is_tradespeople_job

  return {
    ...job,
    // Add poster information (prioritize homeowner for trade jobs, company for vacancies)
    poster_first_name: homeownerProfile?.first_name || null,
    poster_last_name: homeownerProfile?.last_name || null,
    poster_nickname: null,
    poster_logo_url: homeownerProfile?.profile_photo_url || companyProfile?.logo_url || null,
    poster_company_name: companyProfile?.company_name || null,
    // Add rating information
    average_rating: homeownerProfile?.average_rating || 0,
    total_reviews: homeownerProfile?.reviews_count || 0,
  }
})
```

**Why**: Trade Jobs can be posted by either homeowners or companies. This enrichment handles both cases correctly.

### Fix 4: Added I18N Translations
**Files**:
- `lib/i18n/dictionaries/en.ts` (line 692)
- `lib/i18n/dictionaries/pt-BR.ts` (line 692)

Added timeout error messages:

```typescript
// English
searchTimeout: 'Search timed out. Please try again or adjust your filters.',

// Portuguese
searchTimeout: 'Busca expirou. Por favor, tente novamente ou ajuste seus filtros.',
```

---

## Diagnostic Tools Created

### 1. CHECK_RLS_POLICIES.sql
Run this in Supabase SQL Editor to check:
- If RLS is enabled on `jobs`, `homeowner_profiles`, `company_profiles` tables
- What RLS policies exist and who they apply to
- If public/anonymous users can access these tables

### 2. CHECK_TRADE_JOB_COLUMNS.sql
Run this to verify:
- If `category`, `urgency`, `budget_min`, `budget_max` columns exist in the `jobs` table
- What columns actually exist in the `jobs` table

---

## Testing Instructions

### Step 1: Test Timeout Behavior
1. Log in as **Jobseeker**
2. Select **"Trade Jobs"** tab
3. Search for **"Plumber"**
4. **Expected Result**:
   - After 10 seconds, should see timeout error message
   - Console should show: `[MAIN-PAGE-SEARCH] Query failed: Error: Query timeout after 10 seconds`

### Step 2: Check Console Logs
Open browser DevTools (F12) and look for:

```
[MAIN-PAGE-SEARCH] ===== EXECUTING VACANCY/JOB QUERY =====
[MAIN-PAGE-SEARCH] Query parameters: {type: 'jobs_tasks', is_tradespeople_job: true, ...}
[MAIN-PAGE-SEARCH] Executing query with 10s timeout...
[MAIN-PAGE-SEARCH] Query failed: Error: Query timeout after 10 seconds
```

### Step 3: Run Diagnostic Queries
Run `CHECK_RLS_POLICIES.sql` and `CHECK_TRADE_JOB_COLUMNS.sql` in Supabase SQL Editor to identify the root cause.

---

## Next Steps (After Diagnostics)

### If RLS is blocking access:

**Fix**: Grant public read access to `homeowner_profiles` for active jobs:

```sql
-- Allow public to view homeowner profiles for active trade jobs
CREATE POLICY "Public can view homeowner profiles for active jobs"
ON homeowner_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.homeowner_id = homeowner_profiles.id
      AND jobs.is_tradespeople_job = true
      AND jobs.status = 'open'
      AND jobs.is_active = true
  )
);
```

### If columns are missing:

**Option 1**: Remove filters that reference missing columns:

```typescript
// Comment out or remove filters for missing columns
// if (tradeCategory !== "all") {
//   query = query.eq("category", categoryValue)
// }
```

**Option 2**: Add missing columns to `jobs` table:

```sql
ALTER TABLE jobs
  ADD COLUMN category TEXT,
  ADD COLUMN urgency TEXT,
  ADD COLUMN budget_min INTEGER,
  ADD COLUMN budget_max INTEGER;
```

### If there are no open Trade Jobs:

The query should still complete quickly with 0 results. If it times out even with 0 results, it's likely an RLS or join issue.

---

## Why Vacancies Work But Trade Jobs Don't

**Vacancies** (is_tradespeople_job = false):
- Posted by companies only
- Join with `company_profiles` works fine
- No complex filters on missing columns
- RLS likely allows public access

**Trade Jobs** (is_tradespeople_job = true):
- Posted by homeowners OR companies
- Join with `homeowner_profiles` may be blocked by RLS
- Filters reference potentially missing columns (`category`, `urgency`, `budget_min/max`)
- May have stricter privacy policies

---

## Temporary Workaround

If the timeout persists and diagnostics show RLS/column issues:

**Option 1**: Disable Trade Jobs search temporarily:

```typescript
if (type === "jobs_tasks") {
  alert("Trade Jobs search is temporarily unavailable. Please check back later.")
  return
}
```

**Option 2**: Simplify Trade Jobs query (remove filters):

```typescript
if (type === "jobs_tasks") {
  // Skip all Trade Job specific filters
  console.log(`[MAIN-PAGE-SEARCH] Skipping Trade Job filters (simplified query)`)
}
```

---

## Expected Behavior After Fix

1. ✅ **With Timeout**: Search times out after 10 seconds with clear error message
2. ✅ **With User Feedback**: User sees why search failed (not just infinite loading)
3. ✅ **With Diagnostics**: We can identify exact root cause (RLS vs columns vs other)
4. ✅ **With Proper Enrichment**: Results show correct poster info (homeowner or company)

---

## Files Modified

1. ✅ `components/main-page-search.tsx` - Added timeout, error handling, improved enrichment
2. ✅ `lib/i18n/dictionaries/en.ts` - Added searchTimeout translation
3. ✅ `lib/i18n/dictionaries/pt-BR.ts` - Added searchTimeout translation

## Files Created

1. 📄 `CHECK_RLS_POLICIES.sql` - Diagnostic queries for RLS policies
2. 📄 `CHECK_TRADE_JOB_COLUMNS.sql` - Diagnostic queries for column existence
3. 📄 `TRADE_JOBS_SEARCH_FIX.md` - This documentation

---

## Success Criteria

- [ ] Trade Jobs search completes within 10 seconds (either with results or timeout)
- [ ] User sees clear error message if search fails
- [ ] Console logs show detailed debugging information
- [ ] Diagnostic queries identify root cause
- [ ] RLS policies or missing columns are fixed based on diagnostics

---

## Summary

The Trade Jobs search was hanging indefinitely. I've added:
1. **10-second timeout** to prevent infinite waiting
2. **User-friendly error messages** in English and Portuguese
3. **Better data enrichment** to handle both homeowner and company posters
4. **Diagnostic SQL scripts** to identify root cause

**Next Step**: Test the search, wait for timeout, and run diagnostic queries to identify whether it's an RLS policy issue or missing column issue.
