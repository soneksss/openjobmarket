# Search Filters Not Working - Investigation

## Problems Identified

### 🔴 Problem 1: Language Filter Disabled
**Location**: [components/main-page-search.tsx](c:\Users\sonek\OneDrive\Desktop\MAIN\openjobmarket\components\main-page-search.tsx)

**Lines**:
- Line 987 (Professionals)
- Line 1142 (Companies)
- Line 1341 (Talents)

**Issue**: Language filter is **COMMENTED OUT** in all queries:

```typescript
// Language filter for companies - temporarily disabled for debugging
if (spokenLanguage && spokenLanguage !== "all") {
  console.log(`[MAIN-PAGE-SEARCH] Language filter selected for companies: ${spokenLanguage}`)
  console.log(`[MAIN-PAGE-SEARCH] NOTE: Language filter temporarily disabled - will filter results client-side`)
  // companyQuery = companyQuery.contains("spoken_languages", [spokenLanguage])  // ❌ COMMENTED OUT
}
```

**Result**: When user selects "Russian" language, the filter does NOTHING. All results are returned regardless of language.

---

### 🔴 Problem 2: Services Not Searched for Companies
**Location**: [components/main-page-search.tsx:1130-1133](c:\Users\sonek\OneDrive\Desktop\MAIN\openjobmarket\components\main-page-search.tsx#L1130)

**Issue**: Company search only looks in `company_name` and `industry`:

```typescript
const orConditions = searchTerms.flatMap(term => [
  `company_name.ilike.%${term}%`,  // ✅ Searches company name
  `industry.ilike.%${term}%`        // ✅ Searches industry
  // ❌ MISSING: Does NOT search services array!
]).join(',')
```

**What's Missing**:
- No search in `services` array
- When searching "Plumber" or "Gas engineer", won't find companies that have these in their services

**Example**:
- Company: "PRIMEFLOW HEATING & COOLING LTD"
- Services: ["Gas", "Heating", "Plumbing"]
- Search: "Gas engineer" or "Plumber"
- Result: ❌ NOT FOUND (because search doesn't check services array)

---

## Why This Happens

### Companies with Services vs Industry

**Company Profile Structure**:
```typescript
{
  company_name: "PRIMEFLOW HEATING & COOLING LTD",
  industry: "Construction",  // Generic industry
  services: ["Gas", "Heating", "Plumbing"],  // Specific services
  spoken_languages: ["English", "Russian"],
  open_for_business: true
}
```

**Current Search Logic**:
```typescript
// Searches:
// 1. company_name ILIKE '%plumber%'  → ❌ "PRIMEFLOW" doesn't contain "plumber"
// 2. industry ILIKE '%plumber%'      → ❌ "Construction" doesn't contain "plumber"
// MISSING: Check if services array contains "Plumbing"
```

---

## The Fixes

### ✅ Fix 1: Enable Language Filter

**File**: `components/main-page-search.tsx`

**Lines to uncomment**:

**For Companies (line 1142)**:
```typescript
// BEFORE (commented out):
// companyQuery = companyQuery.contains("spoken_languages", [spokenLanguage])

// AFTER (uncommented):
companyQuery = companyQuery.contains("spoken_languages", [spokenLanguage])
```

**For Professionals (line 987)**:
```typescript
// BEFORE:
// profQuery = profQuery.contains("spoken_languages", [spokenLanguage])

// AFTER:
profQuery = profQuery.contains("spoken_languages", [spokenLanguage])
```

**For Talents (line 1341)**:
```typescript
// BEFORE:
// query = query.contains("spoken_languages", [spokenLanguage])

// AFTER:
query = query.contains("spoken_languages", [spokenLanguage])
```

**Also remove the debug logs** (lines 985-986, 1140-1141, 1339-1340).

---

### ✅ Fix 2: Add Services Search for Companies

**File**: `components/main-page-search.tsx`
**Lines**: Around 1130-1135

**BEFORE**:
```typescript
const orConditions = searchTerms.flatMap(term => [
  `company_name.ilike.%${term}%`,
  `industry.ilike.%${term}%`
]).join(',')

companyQuery = companyQuery.or(orConditions)
```

**AFTER**:
```typescript
// Build search conditions for each term
const orConditions = searchTerms.flatMap(term => [
  `company_name.ilike.%${term}%`,
  `industry.ilike.%${term}%`,
  `services.cs.{${term}}`  // Search in services array (case-insensitive)
]).join(',')

companyQuery = companyQuery.or(orConditions)
```

**Note on services search**:
- `cs` = "contains (case-sensitive)"
- For case-insensitive array search, we might need client-side filtering
- Alternative: Use PostgREST array operators

**Better approach** (case-insensitive):
```typescript
// For each search term, we need to check if ANY service contains it
// Since Supabase doesn't have case-insensitive array contains, we need to:
// 1. Get all companies
// 2. Filter client-side
// OR create a more complex query

const orConditions = searchTerms.flatMap(term => [
  `company_name.ilike.%${term}%`,
  `industry.ilike.%${term}%`,
  // For services, we'll filter client-side after query
]).join(',')

companyQuery = companyQuery.or(orConditions)

// After fetching:
const { data: companies } = await companyQuery
const filteredCompanies = companies.filter(company => {
  if (!company.services || searchTerms.length === 0) return true

  // Check if any service matches any search term (case-insensitive)
  return searchTerms.some(term =>
    company.services.some((service: string) =>
      service.toLowerCase().includes(term.toLowerCase())
    )
  )
})
```

---

## Complete Fix Code

### Fix for main-page-search.tsx

**Location**: Around lines 1110-1200

```typescript
// Fetch companies who trade (open_for_business)
let companyQuery = supabase
  .from("company_profiles")
  .select("*")
  .eq("open_for_business", true)

if (searchQuery.trim()) {
  const searchTerm = searchQuery.trim().toLowerCase()

  // Expand search terms with synonyms
  const searchTerms = [searchTerm]
  if (searchTerm.includes('builder') || searchTerm.includes('building')) {
    searchTerms.push('construction')
  }
  if (searchTerm.includes('plumber')) {
    searchTerms.push('plumbing', 'heating')
  }
  if (searchTerm.includes('gas') && searchTerm.includes('engineer')) {
    searchTerms.push('gas', 'heating', 'boiler')
  }
  if (searchTerm.includes('electrician')) {
    searchTerms.push('electrical', 'electric')
  }
  if (searchTerm.includes('carpenter')) {
    searchTerms.push('carpentry', 'joinery')
  }

  // Build OR conditions - search in company name and industry
  const orConditions = searchTerms.flatMap(term => [
    `company_name.ilike.%${term}%`,
    `industry.ilike.%${term}%`
  ]).join(',')

  companyQuery = companyQuery.or(orConditions)
}

// ✅ FIX 1: Enable language filter
if (spokenLanguage && spokenLanguage !== "all") {
  console.log(`[MAIN-PAGE-SEARCH] Applying language filter: ${spokenLanguage}`)
  companyQuery = companyQuery.contains("spoken_languages", [spokenLanguage])
}

// Apply location-based radius filtering
if (selectedLocation) {
  const lat = selectedLocation.lat
  const lon = selectedLocation.lon
  const radiusMiles = parseInt(distance) || 10
  const radiusKm = radiusMiles * 1.60934
  const latDelta = radiusKm / 111.0
  const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

  companyQuery = companyQuery
    .gte("latitude", lat - latDelta)
    .lte("latitude", lat + latDelta)
    .gte("longitude", lon - lngDelta)
    .lte("longitude", lon + lngDelta)
}

// Execute query with timeout
const COMPANY_TIMEOUT = 10000
console.log(`[MAIN-PAGE-SEARCH] Executing company query with ${COMPANY_TIMEOUT/1000}s timeout...`)

const companyTimeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('QUERY_TIMEOUT')), COMPANY_TIMEOUT)
)
const companyQueryPromise = companyQuery

try {
  const { data: companies, error: companiesError } = await Promise.race([
    companyQueryPromise,
    companyTimeoutPromise
  ]) as any

  if (companiesError) throw companiesError

  console.log(`[MAIN-PAGE-SEARCH] Fetched ${companies?.length || 0} companies`)

  // ✅ FIX 2: Filter companies by services (client-side)
  let filteredCompanies = companies || []

  if (searchQuery.trim() && filteredCompanies.length > 0) {
    const searchTerm = searchQuery.trim().toLowerCase()
    const searchTerms = [searchTerm]

    // Add synonyms (same as above)
    if (searchTerm.includes('plumber')) {
      searchTerms.push('plumbing', 'heating')
    }
    if (searchTerm.includes('gas')) {
      searchTerms.push('heating', 'boiler')
    }
    if (searchTerm.includes('electrician')) {
      searchTerms.push('electrical', 'electric')
    }

    // Filter by services
    const companiesMatchingServices = filteredCompanies.filter((company: any) => {
      // If no services array, rely on previous company_name/industry match
      if (!company.services || !Array.isArray(company.services)) {
        return true
      }

      // Check if any service matches any search term
      return searchTerms.some(term =>
        company.services.some((service: string) =>
          service.toLowerCase().includes(term)
        )
      )
    })

    console.log(`[MAIN-PAGE-SEARCH] After services filter: ${companiesMatchingServices.length} companies`)
    filteredCompanies = companiesMatchingServices
  }

  if (filteredCompanies && filteredCompanies.length > 0) {
    results.traders.push(...filteredCompanies.map((item: any) => ({
      id: item.id,
      name: item.company_name,
      coordinates: {
        lat: item.latitude!,
        lon: item.longitude!
      },
      type: 'company'
    })))
  }
} catch (error: any) {
  if (error.message === 'QUERY_TIMEOUT') {
    console.warn('[MAIN-PAGE-SEARCH] Company query timeout - skipping')
  } else {
    console.error('[MAIN-PAGE-SEARCH] Company query error:', error)
  }
}
```

---

## Testing After Fixes

### Test 1: Language Filter
1. Search for "Plumber"
2. Select language "Russian"
3. Set location and radius
4. Click Search
5. Should ONLY show companies with `spoken_languages` containing "Russian"
6. Console should show: `[MAIN-PAGE-SEARCH] Applying language filter: Russian`

### Test 2: Services Search
1. Search for "Gas engineer"
2. Should find "PRIMEFLOW HEATING & COOLING LTD" (has "Gas" in services)
3. Console should show:
   ```
   [MAIN-PAGE-SEARCH] Fetched X companies
   [MAIN-PAGE-SEARCH] After services filter: Y companies
   ```

### Test 3: Combined Filters
1. Search for "Plumber"
2. Language "Russian"
3. Location + radius
4. Should find companies with:
   - "Plumbing" in services OR "Plumber" in name/industry
   - AND "Russian" in spoken_languages
   - AND within radius

---

## Diagnostic Query

Run this to check PRIMEFLOW company:

```sql
SELECT
  company_name,
  industry,
  services,
  spoken_languages,
  location,
  latitude,
  longitude,
  open_for_business
FROM company_profiles
WHERE company_name ILIKE '%PRIMEFLOW%';
```

Expected to see:
```
company_name: PRIMEFLOW HEATING & COOLING LTD
services: ["Gas", "Heating", "Plumbing"] (or similar)
spoken_languages: ["English", "Russian"] (or similar)
open_for_business: true
```

---

## Summary

**Problems**:
1. ❌ Language filter disabled (commented out)
2. ❌ Services array not searched for companies

**Fixes**:
1. ✅ Uncomment language filter lines (3 locations)
2. ✅ Add client-side filtering by services array

**Impact**: Search will now properly find companies by their services and language

---

**Next Steps**:
1. Run diagnostic query to confirm PRIMEFLOW exists
2. Apply the fixes to main-page-search.tsx
3. Test search with "Plumber" + "Russian" language
4. Test search with "Gas engineer"
