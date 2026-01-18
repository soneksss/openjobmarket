# Jobseeker Display Label & Trade Job Posting Fix

## Overview

Fixed two issues related to jobseeker accounts:
1. Display label showing "Individual - Jobseeker, Homeowner" instead of just "Jobseeker"
2. Jobseekers unable to post trade jobs (only homeowners could)

## Problems Solved

### Problem 1: Redundant Display Label
**Before**: Users with both `is_jobseeker=true` and `is_homeowner=true` showed as "Individual - Jobseeker, Homeowner"
**After**: Shows as "Individual - Jobseeker" only

**Reasoning**:
- Jobseekers can do everything homeowners can (apply to jobs + post trade jobs)
- Both are individual accounts with different feature flags
- Showing both roles is redundant and confusing

### Problem 2: Jobseekers Can't Post Trade Jobs
**Before**: Only homeowners had access to post trade jobs via `/dashboard/homeowner/post-job`
**After**: Jobseekers with `is_homeowner=true` can also post trade jobs via `/dashboard/professional/post-job`

**Reasoning**:
- According to the Quick Check modal, "Employed" users get both `is_jobseeker=true` and `is_homeowner=true`
- They should be able to both apply to jobs AND post trade jobs
- Same capability as homeowners, just accessed from a different dashboard

## Files Modified (3 files)

### 1. Account Type Label Logic
**File**: [lib/account-type-label.ts](lib/account-type-label.ts:37-44)

**Changes**:
```typescript
// BEFORE:
if (is_jobseeker || user_type === 'professional' || user_type === 'jobseeker') {
  roleDescriptions.push('Jobseeker')
}

if (is_homeowner || user_type === 'homeowner') {
  roleDescriptions.push('Homeowner')
}

// AFTER:
// Jobseekers can do everything homeowners can (apply to jobs + post trade jobs)
// So we only show "Jobseeker" even if is_homeowner is also true
if (is_jobseeker || user_type === 'professional' || user_type === 'jobseeker') {
  roleDescriptions.push('Jobseeker')
} else if (is_homeowner || user_type === 'homeowner') {
  // Only show "Homeowner" if they're NOT a jobseeker
  roleDescriptions.push('Homeowner')
}
```

**Result**:
- Jobseekers show as "Individual - Jobseeker" (not "Individual - Jobseeker, Homeowner")
- Homeowners still show as "Individual - Homeowner"

### 2. Professional Dashboard Page
**File**: [app/dashboard/professional/page.tsx](app/dashboard/professional/page.tsx:123-134)

**Changes**:
```typescript
// Added canPostTradeJobs prop
return (
  <ProfessionalDashboard
    user={user as any}
    profile={profile}
    applications={applications || []}
    savedJobs={savedJobs || []}
    hasCV={!!cvRecord}
    accountTypeLabel={accountTypeLabel}
    canPostTradeJobs={userData?.is_homeowner || false}  // NEW
  />
)
```

**Result**: Passes the `is_homeowner` flag to the component

### 3. Professional Dashboard Component
**File**: [components/professional-dashboard.tsx](components/professional-dashboard.tsx:87-97)

**Changes**:

**a) Props Interface** (lines 87-97):
```typescript
interface ProfessionalDashboardProps {
  user: User
  profile: Profile
  applications: Application[]
  savedJobs: SavedJob[]
  hasCV: boolean
  accountTypeLabel: string
  canPostTradeJobs?: boolean  // NEW
}

export default function ProfessionalDashboard({
  user, profile, applications, savedJobs, hasCV, accountTypeLabel,
  canPostTradeJobs = false  // NEW
}: ProfessionalDashboardProps) {
```

**b) Quick Actions Grid** (lines 936-978):
```typescript
// Dynamic grid columns based on whether user can post trade jobs
<div className={`grid ${canPostTradeJobs ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4'} gap-1.5 sm:gap-2 md:gap-3`}>
  {/* Existing buttons: Search, Applications, Saved Jobs, CV Builder */}

  {/* NEW: Post Trade Job button (conditionally shown) */}
  {canPostTradeJobs && (
    <Button variant="outline" asChild className="h-auto p-1 sm:p-2 flex-col bg-transparent border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white">
      <Link href="/dashboard/professional/post-job">
        <Hammer className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
        <span className="font-semibold text-sm sm:text-base leading-tight">Post Trade Job</span>
        <span className="text-sm opacity-90 hidden md:block">Find Trades</span>
      </Link>
    </Button>
  )}
</div>
```

**Result**:
- Grid adjusts from 4 columns to 5 columns when "Post Trade Job" button is shown
- Button only appears for users with `is_homeowner=true`
- Uses orange color scheme to match homeowner branding

## Files Created (1 file)

### Professional Post Job Page
**File**: [app/dashboard/professional/post-job/page.tsx](app/dashboard/professional/post-job/page.tsx:1-44)

**Purpose**: Allows jobseekers to post trade jobs

**Code**:
```typescript
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import JobWizardModal from "@/components/job-wizard-modal"

export default async function ProfessionalPostJobPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Get professional profile
  const { data: profile } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding")
  }

  // Check if user has homeowner permission (is_homeowner flag)
  const { data: userData } = await supabase
    .from("users")
    .select("is_homeowner, is_jobseeker")
    .eq("id", user.id)
    .single()

  // Jobseekers with is_homeowner=true can post trade jobs
  if (!userData?.is_homeowner) {
    // Redirect to upgrade page or show message
    redirect("/dashboard/professional")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <JobWizardModal companyProfile={profile} userType="homeowner" />
    </div>
  )
}
```

**Key Features**:
- Checks for `professional_profiles` (not `homeowner_profiles`)
- Validates `is_homeowner=true` flag before allowing access
- Reuses existing `JobWizardModal` component (same as homeowners use)
- Redirects back to dashboard if user doesn't have permission

## User Flow

### Scenario 1: Jobseeker with Homeowner Permission
1. User signs up via Quick Check → "Employed"
2. Gets `is_jobseeker=true` and `is_homeowner=true` flags
3. Profile created in `professional_profiles`
4. Dashboard shows "Individual - Jobseeker" (not "Individual - Jobseeker, Homeowner")
5. Can see "Post Trade Job" button in Quick Actions
6. Can post trade jobs to find tradespeople

### Scenario 2: Jobseeker without Homeowner Permission
1. User signs up as pure jobseeker
2. Gets `is_jobseeker=true` and `is_homeowner=false`
3. Profile created in `professional_profiles`
4. Dashboard shows "Individual - Jobseeker"
5. Does NOT see "Post Trade Job" button
6. Can only apply to jobs, not post them

### Scenario 3: Homeowner Only
1. User signs up via Quick Check → "Homeowner"
2. Gets `is_jobseeker=false` and `is_homeowner=true`
3. Profile created in `homeowner_profiles`
4. Dashboard shows "Individual - Homeowner"
5. Uses `/dashboard/homeowner/post-job` (existing page)

## Permissions Matrix

| Account Type | is_jobseeker | is_homeowner | Display Label | Can Apply to Jobs | Can Post Trade Jobs | Dashboard |
|--------------|--------------|--------------|---------------|-------------------|---------------------|-----------|
| Jobseeker (Multi-role) | ✅ true | ✅ true | "Individual - Jobseeker" | ✅ Yes | ✅ Yes | `/dashboard/professional` |
| Jobseeker (Pure) | ✅ true | ❌ false | "Individual - Jobseeker" | ✅ Yes | ❌ No | `/dashboard/professional` |
| Homeowner | ❌ false | ✅ true | "Individual - Homeowner" | ❌ No | ✅ Yes | `/dashboard/homeowner` |

## Quick Check Modal Mapping

| User Selection | is_jobseeker | is_homeowner | Display Label | Can Post Trade Jobs |
|----------------|--------------|--------------|---------------|---------------------|
| 🏠 Homeowner | false | true | "Homeowner" | ✅ Yes (via homeowner dashboard) |
| 💼 Employed | **true** | **true** | "Jobseeker" | ✅ Yes (via professional dashboard) |
| 🔍 Unemployed | **true** | **true** | "Jobseeker" | ✅ Yes (via professional dashboard) |
| 🔧 Self-Employed | false | false | "Self-Employed" | ✅ Yes (company dashboard) |
| 🏢 Company Owner | false | false | "Company" | ✅ Yes (company dashboard) |

**Note**: "Employed" and "Unemployed" users get both flags so they can apply to jobs AND post trade jobs.

## Testing Checklist

### Test 1: Display Label
- [ ] Sign up as "Employed" (gets both flags)
- [ ] Check dashboard header
- [ ] Should show "Individual - Jobseeker" (not "Individual - Jobseeker, Homeowner")

### Test 2: Post Trade Job Button Visibility
- [ ] Sign up as "Employed" (gets both flags)
- [ ] Go to `/dashboard/professional`
- [ ] Should see "Post Trade Job" button in Quick Actions (orange button with hammer icon)

### Test 3: Post Trade Job Flow
- [ ] Click "Post Trade Job" button
- [ ] Should open job wizard modal
- [ ] Fill out job details
- [ ] Submit job
- [ ] Job should be created successfully

### Test 4: Permission Check
- [ ] Sign up as pure jobseeker (only `is_jobseeker=true`)
- [ ] Should NOT see "Post Trade Job" button
- [ ] Try to access `/dashboard/professional/post-job` directly
- [ ] Should redirect back to `/dashboard/professional`

### Test 5: Homeowner Not Affected
- [ ] Sign up as "Homeowner"
- [ ] Go to `/dashboard/homeowner`
- [ ] Should still have "Post Job" functionality
- [ ] Existing behavior unchanged

## Technical Notes

### Why Reuse JobWizardModal?
- Both homeowners and jobseekers post the same type of jobs (trade jobs)
- No need to duplicate code
- Component accepts `userType="homeowner"` regardless of actual user type
- This is intentional as both types post to the `jobs` table the same way

### Why Check is_homeowner Flag?
- The Quick Check modal sets `is_homeowner=true` for users who might need services
- "Employed" and "Unemployed" users might need home repairs while also looking for jobs
- Pure jobseekers (no homeowner flag) typically don't need to post trade jobs

### Grid Layout Adjustment
- Without "Post Trade Job": 4 buttons → `grid-cols-4`
- With "Post Trade Job": 5 buttons → `grid-cols-5`
- Responsive: `grid-cols-2` on mobile, `grid-cols-3` on tablet, `grid-cols-5` on desktop

## Database Impact

**No database changes required**. All necessary fields already exist:
- `users.is_homeowner` - Already exists
- `users.is_jobseeker` - Already exists
- `professional_profiles` - Already exists
- Job posting logic - Already exists (reused from homeowner flow)

## Build Status

✅ Build successful (`npm run build` completed without errors)
✅ No TypeScript errors
✅ All routes compiled successfully

## Deployment Steps

1. **Deploy code changes**:
   ```bash
   git add .
   git commit -m "Fix jobseeker display label and enable trade job posting"
   git push origin main
   ```

2. **No database migrations needed** - Using existing schema

3. **Test in production**:
   - Sign up as "Employed" user
   - Verify display shows "Jobseeker" only
   - Verify "Post Trade Job" button appears
   - Test posting a trade job

## Summary

✅ **Fixed display label** - Shows "Jobseeker" instead of "Jobseeker, Homeowner"
✅ **Enabled trade job posting** - Jobseekers can now post trade jobs
✅ **Added conditional button** - Only shows for users with `is_homeowner=true`
✅ **Created new page** - `/dashboard/professional/post-job`
✅ **Reused existing components** - No code duplication
✅ **No database changes** - Uses existing schema
✅ **Build successful** - Ready for deployment

---

**Date**: 2026-01-18
**Files Modified**: 3
**Files Created**: 1
**Database Changes**: None
**Build Status**: ✅ Successful
