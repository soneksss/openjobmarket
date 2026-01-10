# Quick Test Guide: Vacancy Search Fix

## 🔍 Step-by-Step Testing

### Step 1: Check Database (Run SQL in Supabase)
```sql
-- Quick check: How many active vacancies exist?
SELECT COUNT(*) as active_vacancies
FROM jobs
WHERE is_tradespeople_job = FALSE
  AND is_active = TRUE
  AND status = 'open'
  AND (expires_at IS NULL OR expires_at > NOW());
```

**Expected:** Should return count > 0

**If 0:** No vacancies exist - need to create test data via company dashboard

---

### Step 2: Open Browser Console
1. Open your site as a **Jobseeker** (not logged in or logged in as professional)
2. Press F12 to open DevTools
3. Go to "Console" tab
4. Clear console logs

---

### Step 3: Search for "Plumber"
1. Go to homepage
2. Ensure "Vacancies" tab is selected (not Trade Jobs)
3. Type "Plumber" in search box
4. Select any location (e.g., "London")
5. Click Search

---

### Step 4: Check Console Output

**Look for these log messages:**

```
✅ GOOD - Query executed successfully:
[MAIN-PAGE-SEARCH] ===== EXECUTING VACANCY/JOB QUERY =====
[MAIN-PAGE-SEARCH] Query parameters: { type: "vacancies", is_tradespeople_job: false, ... }
[MAIN-PAGE-SEARCH] Query completed. Error: null Data count: 5

✅ GOOD - Jobs found with coordinate info:
[MAIN-PAGE-SEARCH] Jobs with coordinates: 3, without coordinates: 2
[MAIN-PAGE-SEARCH] Enriched 5 jobs with poster data (including 2 without coordinates)

✅ GOOD - Sample job details:
[MAIN-PAGE-SEARCH] Sample job data (first result): {
  id: "xxx",
  title: "Plumber",
  is_tradespeople_job: false,
  status: "open",
  is_active: true,
  latitude: 51.5074,
  longitude: -0.1278,
  ...
}
```

**❌ BAD - No results:**
```
[MAIN-PAGE-SEARCH] Query completed. Error: null Data count: 0
```

---

### Step 5: Check UI

**✅ Expected Success Behavior:**
- Modal/Map opens with search results
- Results show in list view on the side
- Jobs with coordinates show pins on map
- Jobs without coordinates show in list only
- "X out of Y" indicator shows total count

**❌ Problem Indicators:**
- "0 out of 0" message
- Empty map with no pins
- Empty results list
- No modal opens

---

## 🐛 Troubleshooting Decision Tree

### Issue: Still showing "0 out of 0"

**Check 1: Console shows "Data count: 0"?**
- **YES** → Database query returned nothing
  - Run diagnostic SQL (DIAGNOSE_VACANCY_SEARCH.sql)
  - Check if vacancies exist
  - Check if status = 'open'
  - Check if is_active = TRUE
  - Check if is_tradespeople_job = FALSE

**Check 2: Console shows "Data count: 5" but UI shows 0?**
- **YES** → Results are being filtered after query
  - Check if results are being passed to map component
  - Check if mapResults state is being set
  - Check browser console for React errors

**Check 3: Console shows timeout or RPC error?**
- **YES** → Database connection issue
  - Check if `is_signin_required_to_search` function exists
  - Check Supabase connection
  - Check if migrations were run

**Check 4: Console shows "without coordinates: 5"?**
- **YES** → All jobs lack coordinates
  - This is OK! Jobs should still show in list
  - If they don't appear, check if list view is rendered
  - Check if JobCard component handles missing coordinates

---

## 🎯 Success Indicators

✅ **Database has active vacancies** (SQL query returns count > 0)
✅ **Console shows "Data count: X"** where X > 0
✅ **Console shows coordinate breakdown** (e.g., "3 with, 2 without")
✅ **UI shows results in list view**
✅ **UI shows "X out of Y" with correct counts**
✅ **Jobs with coordinates appear on map as pins**
✅ **No JavaScript errors in console**
✅ **No TypeScript compilation errors**

---

## 📊 Diagnostic Queries Reference

### Count Active Vacancies
```sql
SELECT COUNT(*) FROM jobs
WHERE is_tradespeople_job = FALSE
  AND is_active = TRUE
  AND status = 'open';
```

### Check Plumber Vacancies
```sql
SELECT id, title, status, is_active, latitude, longitude
FROM jobs
WHERE is_tradespeople_job = FALSE
  AND LOWER(title) LIKE '%plumber%';
```

### Check Company "Remus" Jobs
```sql
SELECT j.*, cp.company_name
FROM jobs j
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE cp.company_name ILIKE '%remus%';
```

### Check Job Status Distribution
```sql
SELECT status, is_active, is_tradespeople_job, COUNT(*)
FROM jobs
GROUP BY status, is_active, is_tradespeople_job;
```

---

## 🚨 Common Pitfalls

**❌ Searching in Trade Jobs tab instead of Vacancies**
- Trade Jobs = `is_tradespeople_job = TRUE`
- Vacancies = `is_tradespeople_job = FALSE`
- These are completely separate categories!

**❌ Jobs have status ≠ 'open'**
- Check: `status IN ('accepted', 'in_progress', 'completed', 'failed')`
- Only `status = 'open'` appears in search

**❌ Jobs are expired**
- Check: `expires_at < NOW()`
- Expired jobs are excluded from search

**❌ Jobs are inactive**
- Check: `is_active = FALSE`
- Inactive jobs are excluded from search

**❌ Location filter too strict**
- If location radius is very small (e.g., 1 mile), may exclude many jobs
- Try searching with larger radius (e.g., 50-100 miles)

---

## 📝 Test Data Creation (If Needed)

If no vacancies exist, create test data:

1. Log in as a **Company** user
2. Go to Company Dashboard
3. Click "Post New Vacancy"
4. Fill form:
   - Title: "Plumber Required"
   - Job Type: "Full Time"
   - Select location on map (IMPORTANT!)
   - Fill other required fields
5. Publish job
6. Repeat test

**Important:** Make sure to select location on the map during job posting to ensure coordinates are set!

---

## ✅ Final Verification

After testing, confirm:
- [ ] Diagnostic SQL shows vacancies exist
- [ ] Console logs show query executed successfully
- [ ] Console shows "Data count: X" where X > 0
- [ ] UI displays search results
- [ ] Map shows jobs with coordinates
- [ ] List shows all jobs (including those without coordinates)
- [ ] No errors in browser console
- [ ] Company dashboard still works (no regression)

**If all checkboxes are ✅, the fix is successful!**
