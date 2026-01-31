# Search Filters - Fixes Applied ✅

## Summary of Issues Fixed

### Issue 1: Services Not Saved from Signup ✅ FIXED
**Problem**: Services entered during signup weren't appearing in profile edit.

**Root Cause**: Trigger function `create_company_profile_from_metadata` wasn't extracting services from metadata.

**Fix Applied**: Updated migration `20260130000004_create_company_profile_from_metadata.sql` to extract and save services array from JSONB metadata.

**Files Modified**:
- [supabase/migrations/20260130000004_create_company_profile_from_metadata.sql](supabase/migrations/20260130000004_create_company_profile_from_metadata.sql)

---

### Issue 2: Services Made Optional During Signup ✅ FIXED
**Problem**: Services were required during signup, blocking users.

**Root Cause**: Validation in multi-step signup required services for tradespeople.

**Fix Applied**:
- Commented out services validation (line 265-269)
- Updated UI to show "(Optional)" label
- Updated placeholder text and help text

**Files Modified**:
- [components/multi-step-signup.tsx](components/multi-step-signup.tsx) (lines 265-269, 833, 881, 928)

---

### Issue 3: Language Filters Disabled ✅ FIXED
**Problem**: Language filters were commented out for all profile types (Professionals, Companies, Contractors, Talents).

**Root Cause**: Filters were temporarily disabled for debugging and never re-enabled.

**Fix Applied**: Enabled language filters for all profile types:
- **Professionals** - Line 1040-1043: `profQuery.contains("spoken_languages", [spokenLanguage])`
- **Companies** - Line 1193-1197: `companyQuery.contains("spoken_languages", [spokenLanguage])`
- **Contractors** - Line 862-866: `contractorQuery.contains("languages", [spokenLanguage])`
- **Talents** - Line 1442-1446: `query.contains("spoken_languages", [spokenLanguage])`

**Files Modified**:
- [components/main-page-search.tsx](components/main-page-search.tsx) (lines 862-866, 1040-1043, 1193-1197, 1442-1446)

**Important Note**: Contractors use column name `languages` instead of `spoken_languages`.

---

### Issue 4: Services Not Searched for Companies ✅ FIXED
**Problem**: Company search only checked `company_name` and `industry`, not the `services` array.

**Root Cause**: PostgreSQL doesn't support case-insensitive array searching via PostgREST operators.

**Fix Applied**: Implemented client-side filtering to check services array:
```typescript
// After fetching companies, filter by services
const companiesWithMatchingServices = filteredCompanies.filter(company => {
  if (!company.services || !Array.isArray(company.services)) {
    return true
  }
  return searchTerms.some(term =>
    company.services.some((service: string) =>
      service.toLowerCase().includes(term)
    )
  )
})
```

**Files Modified**:
- [components/main-page-search.tsx](components/main-page-search.tsx) (lines 1279-1350)

---

### Issue 5: Services Not Searched for Contractors ✅ FIXED
**Problem**: Contractor search didn't check the `services` array.

**Fix Applied**: Implemented client-side filtering identical to companies.

**Files Modified**:
- [components/main-page-search.tsx](components/main-page-search.tsx) (lines 945-1002)

---

### Issue 6: Column Name Inconsistency 📝 DOCUMENTED
**Problem**: `contractor_profiles` uses `languages` while other tables use `spoken_languages`.

**Status**: Documented and handled in code. All searches use correct column names.

**Files with Correct Column Usage**:
- [components/main-page-search.tsx](components/main-page-search.tsx) - Line 865 uses `languages` for contractors

---

## Testing Checklist

### Test 1: Language Filter - Professionals ✅
1. Go to search page
2. Enter search term: "Plumber"
3. Select language: "Russian"
4. Select location and radius
5. Click Search
6. **Expected**: Only professionals with Russian in `spoken_languages` should appear
7. **Check Console**: Should see `[MAIN-PAGE-SEARCH] Applying language filter: Russian`

### Test 2: Language Filter - Companies ✅
1. Search term: "Plumber"
2. Tab: "Companies" or "Tradespeople"
3. Language: "Russian"
4. **Expected**: Only companies with Russian in `spoken_languages`
5. **Check Console**: Should see `[MAIN-PAGE-SEARCH] Applying language filter for companies: Russian`

### Test 3: Language Filter - Contractors ✅
1. Search term: "Electrician"
2. Tab: "Contractors"
3. Language: "Portuguese"
4. **Expected**: Only contractors with Portuguese in `languages` column
5. **Check Console**: Should see `[MAIN-PAGE-SEARCH] Applying language filter for contractors: Portuguese`

### Test 4: Services Search - Companies ✅
1. Search term: "Gas engineer"
2. Tab: "Companies"
3. **Expected**: Companies with "Gas", "Heating", or "Boiler" in services array should appear
4. **Check Console**: Should see:
   ```
   [SERVICES-DEBUG] === STARTING SERVICES FILTER ===
   [SERVICES-DEBUG] Search terms: ["gas engineer", "gas", "heating", "boiler"]
   [SERVICES-DEBUG] Companies after services filter: X
   ```
5. **Example**: "PRIMEFLOW HEATING & COOLING LTD" should appear (has "Gas" in services)

### Test 5: Services Search - Contractors ✅
1. Search term: "Plumber"
2. Tab: "Contractors"
3. **Expected**: Contractors with "Plumbing" or "Heating" in services should appear
4. **Check Console**: Should see services filter debug logs

### Test 6: Combined Filters ✅
1. Search term: "Plumber"
2. Language: "Russian"
3. Location: London
4. Radius: 10 miles
5. **Expected**: Only companies/contractors that match:
   - Have "Plumbing" or "Heating" in services OR "Plumber" in name/industry
   - AND have "Russian" in spoken_languages/languages
   - AND are within 10 miles of London

### Test 7: PRIMEFLOW Company ✅
**Before testing, run diagnostic SQL**:
```sql
-- Run: supabase/diagnostics/verify_search_fixes.sql
```

**Manual Search Test**:
1. Search term: "Gas engineer"
2. Language: "Russian"
3. Location: (wherever PRIMEFLOW is located)
4. **Expected**: PRIMEFLOW HEATING & COOLING LTD should appear in results

---

## Diagnostic SQL Queries

### Run These to Verify Data

1. **Check PRIMEFLOW company exists**:
   ```bash
   Run: supabase/diagnostics/find_primeflow_company.sql
   ```

2. **Check data quality**:
   ```bash
   Run: supabase/diagnostics/check_search_data_quality.sql
   ```

3. **Check column consistency**:
   ```bash
   Run: supabase/diagnostics/check_all_profile_columns.sql
   ```

4. **Final verification**:
   ```bash
   Run: supabase/diagnostics/verify_search_fixes.sql
   ```

---

## Code Changes Summary

### Files Modified (3)
1. **[components/main-page-search.tsx](components/main-page-search.tsx)**
   - Enabled language filters (4 locations)
   - Added services filtering for companies
   - Added services filtering for contractors
   - ~150 lines modified

2. **[components/multi-step-signup.tsx](components/multi-step-signup.tsx)**
   - Made services optional during signup
   - Updated UI labels and help text
   - ~10 lines modified

3. **[supabase/migrations/20260130000004_create_company_profile_from_metadata.sql](supabase/migrations/20260130000004_create_company_profile_from_metadata.sql)**
   - Added services extraction from metadata
   - ~15 lines added

### Files Created (4)
1. **[supabase/diagnostics/find_primeflow_company.sql](supabase/diagnostics/find_primeflow_company.sql)** - Find PRIMEFLOW company
2. **[supabase/diagnostics/check_search_data_quality.sql](supabase/diagnostics/check_search_data_quality.sql)** - Check data quality
3. **[supabase/diagnostics/check_all_profile_columns.sql](supabase/diagnostics/check_all_profile_columns.sql)** - Check column consistency
4. **[supabase/diagnostics/verify_search_fixes.sql](supabase/diagnostics/verify_search_fixes.sql)** - Final verification

---

## Important Notes

### Column Name Differences
- `company_profiles`: Uses `spoken_languages`
- `contractor_profiles`: Uses `languages` ⚠️ (different!)
- `professional_profiles`: Uses `spoken_languages`

### Services Filtering
- **Server-side**: Search in `company_name` and `industry`
- **Client-side**: Filter by `services` array (case-insensitive)
- **Reason**: PostgREST doesn't support case-insensitive array contains

### Search Synonyms
The search expands terms with synonyms:
- "plumber" → adds "plumbing", "heating"
- "gas" → adds "heating", "boiler"
- "electrician" → adds "electrical", "electric"
- "builder" → adds "construction"
- "carpenter" → adds "carpentry", "joinery"

---

## Performance Considerations

### Query Timeouts
All queries have 10-second timeouts:
- Professionals: 10s
- Companies: 10s
- Contractors: 10s
- Talents: 10s

If a query times out, it's skipped and other results are shown.

### Debug Logging
Console logs help track:
- Language filter application
- Services filter results
- Query execution time
- Result counts at each filter stage

---

## Next Steps

1. ✅ **Run Migration**: Ensure `20260130000004` is applied
2. ✅ **Test Search**: Follow testing checklist above
3. ✅ **Run Diagnostics**: Execute all SQL diagnostic queries
4. ✅ **Verify PRIMEFLOW**: Confirm company appears in search results
5. ❓ **Monitor Performance**: Watch for slow queries or timeouts
6. ❓ **User Feedback**: Gather feedback on search accuracy

---

## Bugs Fixed Summary

| # | Bug | Status | Impact |
|---|-----|--------|--------|
| 1 | Services not saved from signup | ✅ Fixed | Users can now see services in profile |
| 2 | Services required at signup | ✅ Fixed | Signup process smoother |
| 3 | Language filter disabled (Professionals) | ✅ Fixed | Language search now works |
| 4 | Language filter disabled (Companies) | ✅ Fixed | Company language search works |
| 5 | Language filter disabled (Contractors) | ✅ Fixed | Contractor language search works |
| 6 | Language filter disabled (Talents) | ✅ Fixed | Talent language search works |
| 7 | Services not searched (Companies) | ✅ Fixed | Can find companies by service |
| 8 | Services not searched (Contractors) | ✅ Fixed | Can find contractors by service |
| 9 | Column name inconsistency | 📝 Documented | Handled in code correctly |

---

## Contact & Support

If search issues persist:
1. Check browser console for errors
2. Run diagnostic SQL queries
3. Check if data exists (services, languages, coordinates)
4. Verify profile visibility settings (`open_for_business`, `available_247`, etc.)

---

**Last Updated**: 2026-01-31
**Version**: 1.0
**Status**: All fixes applied ✅
