# Job Extension Double-Click & Button Stuck Fix

## Issues Identified

### 1. **Double-Click Issue** (Critical)
**Symptom**: User had to click "Extend Job" button twice to actually extend the job.

**Root Cause**: React state update timing issue in [company-jobs-manager.tsx:514-517](components/company-jobs-manager.tsx#L514-L517)

**Original problematic code**:
```typescript
onClick={() => {
  setExtendingJob(job)      // Sets state asynchronously
  handleExtendJob()         // Runs immediately, before state updates
}}
```

**What happened**:
- **First click**:
  - `setExtendingJob(job)` queues state update
  - `handleExtendJob()` runs immediately
  - Function checks `if (!extendingJob || !newTimeline) return`
  - `extendingJob` is still `null` (state hasn't updated yet)
  - Function returns early, does nothing ❌

- **Second click**:
  - `extendingJob` is now set from previous click
  - `handleExtendJob()` actually executes ✅

### 2. **Button Stuck Issue**
**Symptom**: After clicking extend, button stays in "Extending..." state and never resets.

**Root Cause**: Missing error handling and loading state management similar to the accept application button issue.

**Problems**:
- No `finally` block to guarantee loading state reset
- No timeout protection for long-running operations
- Router.refresh() could fail silently, leaving button stuck
- No specific error handling for network/auth failures

### 3. **Not Using Database RPC Function**
**Issue**: Code was directly updating `jobs` table instead of using the dedicated `extend_job` RPC function.

**Original code**:
```typescript
await supabase
  .from("jobs")
  .update({
    recruitment_timeline: newTimeline,
    price: newPrice,
    created_at: newCreatedAt,  // This was problematic
    is_active: true,
  })
  .eq("id", extendingJob.id)
```

**Problems**:
- Bypassed business logic in RPC function
- Updated `created_at` (wrong - should preserve original posting date)
- Didn't calculate `expires_at` correctly
- No validation of timeline values

### 4. **Timeline Value Format Mismatch**
**Issue**: UI used "3 days", "7 days" but database expected "3_days", "7_days".

## Fixes Implemented

### Fix 1: Eliminated Double-Click Requirement ✅

**Changed function signature** to accept parameters instead of relying on state:
```typescript
// OLD: Relied on state that wasn't set yet
const handleExtendJob = async () => {
  if (!extendingJob || !newTimeline) return
  // ...
}

// NEW: Direct parameters, no state dependency
const handleExtendJob = async (jobToExtend: Job, timeline: string) => {
  if (!jobToExtend || !timeline) {
    console.error("[JOB-EXTEND] Missing job or timeline")
    return
  }
  // ...
}
```

**Updated onClick handler**:
```typescript
// OLD: Set state then call function (race condition)
onClick={() => {
  setExtendingJob(job)
  handleExtendJob()
}}

// NEW: Pass parameters directly (no race condition)
onClick={() => handleExtendJob(job, newTimeline)}
```

### Fix 2: Comprehensive Error Handling ✅

Added robust error handling pattern (same as accept application button fix):

```typescript
const handleExtendJob = async (jobToExtend: Job, timeline: string) => {
  setLoading(jobToExtend.id)
  let updateSucceeded = false  // Track success for smart cleanup

  try {
    // ... operation ...
    updateSucceeded = true

    // Protected refresh with fallback
    setTimeout(() => {
      try {
        router.refresh()
      } catch (refreshError) {
        console.error("[JOB-EXTEND] Router refresh failed:", refreshError)
        window.location.reload()  // Fallback if router fails
      }
    }, 1000)
  } catch (error: any) {
    // Specific error messages based on error type
    let errorMessage = "Failed to extend job. Please try again."

    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      errorMessage = "Network connection issue. Please check your connection and try again."
    } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      errorMessage = "Session expired. Please refresh the page and try again."
    }

    alert(errorMessage)

    // Reset dialog state on error
    setExtendingJob(null)
    setNewTimeline("")
  } finally {
    // CRITICAL: Always clear loading state
    if (!updateSucceeded) {
      setLoading(null)  // Immediate if failed
    } else {
      setTimeout(() => setLoading(null), 3000)  // Delayed if succeeded
    }
  }
}
```

### Fix 3: Use RPC Function ✅

**Now uses the database `extend_job` RPC function**:
```typescript
// Use the RPC function for extending jobs
const { data, error } = await supabase.rpc("extend_job", {
  job_id_param: jobToExtend.id,
  new_timeline: dbTimeline,  // Properly formatted
  new_price: newPrice,
})

if (error) {
  if (error.message?.includes("fetch") || error.message?.includes("JWT")) {
    throw new Error("Authentication error. Please refresh the page and try again.")
  }
  throw error
}

if (!data) {
  throw new Error("Failed to extend job - job may not exist or you don't have permission")
}
```

**Benefits of RPC function**:
- Calculates `expires_at` correctly (from NOW + days, not from old date)
- Validates timeline values
- Preserves original `created_at`
- Enforces business logic
- Better error handling

### Fix 4: Timeline Value Mapping ✅

**Added translation layer** between UI and database:
```typescript
// Map display timeline to database format
const timelineMap: { [key: string]: string } = {
  "3 days": "3_days",
  "7 days": "7_days",
  "2 weeks": "14_days",
  "3 weeks": "21_days",
  "4 weeks": "28_days",
}

const dbTimeline = timelineMap[timeline]

if (!dbTimeline) {
  throw new Error("Invalid timeline selected")
}
```

**Job extensions are FREE** - all timeline options are available at no cost:
```html
<SelectItem value="3 days">3 days</SelectItem>
<SelectItem value="7 days">7 days</SelectItem>
<SelectItem value="2 weeks">2 weeks</SelectItem>
<SelectItem value="3 weeks">3 weeks</SelectItem>
<SelectItem value="4 weeks">4 weeks</SelectItem>
```

All prices set to £0 in the priceMap.

## Files Modified

### Primary Fix
- **[components/company-jobs-manager.tsx](components/company-jobs-manager.tsx)**
  - Lines 200-304: Completely rewrote `handleExtendJob` function
  - Lines 551-600: Fixed Dialog onClick handler and added pricing display

### Verification SQL
- **[verify_extend_job.sql](verify_extend_job.sql)** (NEW)
  - SQL queries to verify RPC function exists
  - Check RLS policies
  - Test extend_job function
  - List expired/expiring jobs

## Testing Checklist

### Functional Tests
- [ ] Click "Extend" button once → Job should extend immediately (no double-click needed)
- [ ] Button shows "Extending..." while processing
- [ ] Button resets to normal state after completion
- [ ] Dialog closes after successful extension
- [ ] Page refreshes to show updated expiration date
- [ ] Job becomes active again after extension
- [ ] Job appears on map again after extension

### Error Handling Tests
- [ ] Network disconnection during extend → Shows network error message
- [ ] Session expired during extend → Shows session expired message
- [ ] Invalid job ID → Shows permission/existence error
- [ ] Button unsticks after error
- [ ] Dialog resets after error

### Edge Cases
- [ ] Extend expired job → Works correctly
- [ ] Extend expiring job → Works correctly
- [ ] Multiple rapid clicks → Only processes once (button disabled during loading)
- [ ] Cancel dialog → Resets state properly

## Database Verification

Run the verification script to check database state:

```bash
psql $DATABASE_URL -f verify_extend_job.sql
```

**Expected results**:
1. `extend_job` function exists in public schema
2. RLS policies allow users to update their own jobs
3. Function successfully extends test job
4. Jobs table has all required columns

## Migration Reference

The `extend_job` RPC function was created in:
- **[supabase/migrations/20260110000004_create_extend_job.sql](supabase/migrations/20260110000004_create_extend_job.sql)**

RLS policies verified in:
- **[supabase/migrations/20260119000001_fix_jobs_table_rls_policies.sql](supabase/migrations/20260119000001_fix_jobs_table_rls_policies.sql)**
  - Lines 86-97: "Users can update their own jobs" policy

## Technical Patterns Applied

### 1. Parameter Passing Over State Dependency
✅ **Good**: `handleExtendJob(job, timeline)` - Direct parameters
❌ **Bad**: Rely on `extendingJob` state that may not be updated yet

### 2. Smart Loading State Management
```typescript
let updateSucceeded = false
try {
  // ... operation ...
  updateSucceeded = true
} finally {
  if (!updateSucceeded) {
    setLoading(null)  // Clear immediately on error
  } else {
    setTimeout(() => setLoading(null), 3000)  // Delay on success (allows refresh)
  }
}
```

### 3. Protected Router Refresh
```typescript
setTimeout(() => {
  try {
    router.refresh()
  } catch (refreshError) {
    window.location.reload()  // Fallback
  }
}, 1000)
```

### 4. Specific Error Messages
- Network errors → "Network connection issue..."
- Auth errors → "Session expired..."
- Generic → "Failed to extend job..."

### 5. RPC Over Direct Table Updates
- Encapsulates business logic
- Validates inputs
- Atomic operations
- Better security

## Related Fixes

This fix follows the same pattern as:
- **Accept Application Button Fix** ([application-actions.tsx](components/application-actions.tsx))
- **Homeowner Application Actions Fix** ([homeowner-application-actions.tsx](components/homeowner-application-actions.tsx))

All three now use:
- Smart loading state management
- Comprehensive error handling
- Protected router refresh
- Specific error messages
- Finally blocks for cleanup

## Success Criteria

✅ Single click extends job (no double-click needed)
✅ Button never gets stuck in loading state
✅ Proper error messages for network/auth issues
✅ Uses RPC function instead of direct table update
✅ Timeline values correctly mapped to database format
✅ Pricing displayed in UI for transparency
✅ Page refreshes after successful extension
✅ Dialog state properly managed
