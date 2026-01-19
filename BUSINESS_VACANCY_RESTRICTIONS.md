# Business User Vacancy Restrictions

**Date**: 2026-01-19
**Purpose**: Prevent companies and contractors from applying to or messaging about vacancy jobs

---

## Overview

Vacancy jobs are employment positions meant for individual jobseekers, not businesses. This update adds restrictions to prevent companies and contractors from:
1. **Applying** to vacancy jobs (shows error message)
2. **Messaging** about vacancy jobs (hides message button in search)

**Important**: These restrictions apply ONLY to vacancies. Companies and contractors can still:
- ✅ Message about trade jobs
- ✅ Message in other contexts (profiles, messages page, etc.)
- ✅ Search and view all jobs

---

## Changes Made

### 1. Application Blocking
**File**: `components/job-application-form.tsx:225-232`

**What it does**: Blocks companies and contractors from submitting applications to vacancy jobs.

**Code added**:
```typescript
// CRITICAL: Block companies and contractors from applying to Vacancies
if (!job.is_tradespeople_job && (userType === 'company' || userType === 'contractor')) {
  console.error("[JOB-APPLICATION] BLOCKED: User type '" + userType + "' cannot apply to Vacancies")
  setSubmissionError(
    "Businesses cannot apply for vacancy jobs. Vacancy jobs are employment positions for individual jobseekers. If you're looking to hire professionals or tradespeople, please post a job in the relevant section."
  )
  return
}
```

**When it triggers**:
- Job is a vacancy (`is_tradespeople_job = false`)
- User is a company (`user_type = 'company'`)
- OR user is a contractor (`user_type = 'contractor'`)

**User experience**:
- Error message appears in red
- Submit button is blocked
- Clear explanation provided

### 2. Message Button Hiding
**File**: `components/job-card.tsx`

**What it does**: Hides the message button in job listings when companies/contractors view vacancies.

**Changes**:

#### a) Added user type state (line 91):
```typescript
const [userType, setUserType] = useState<string | null>(null)
```

#### b) Fetch user type on mount (lines 235-256):
```typescript
// Fetch user type
useEffect(() => {
  const fetchUserType = async () => {
    if (!isLoggedIn) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .single()

      if (userData) {
        setUserType(userData.user_type)
      }
    }
  }

  fetchUserType()
}, [isLoggedIn])
```

#### c) Conditionally render message button (lines 597-613):
```typescript
{/* Hide message button for companies/contractors on vacancies */}
{!(
  !job.is_tradespeople_job &&
  (userType === 'company' || userType === 'contractor')
) && (
  <Button
    variant="outline"
    size="sm"
    className="h-9 w-9 sm:h-7 sm:w-7 p-0 touch-manipulation"
    onClick={(e) => {
      e.stopPropagation()
      handleContactClick()
    }}
  >
    <MessageCircle className="h-4 w-4 sm:h-3 sm:w-3" />
  </Button>
)}
```

**Logic breakdown**:
```
Hide if: (job is vacancy) AND (user is company OR contractor)
Show if: (job is trade job) OR (user is professional/homeowner)
```

**User experience**:
- Companies/contractors see: ❤️ [Apply] buttons only (no message button)
- Professionals/homeowners see: ❤️ 💬 [Apply] buttons (all three)
- Message button remains for trade jobs for everyone

---

## Test Scenarios

### Scenario 1: Company Viewing Vacancy
**Setup**: Log in as company, search for vacancies
**Expected**:
- ✅ Can see vacancy listings
- ✅ Can save vacancies (heart button visible)
- ❌ Cannot see message button
- ❌ Cannot apply (blocked with error message if they try)

### Scenario 2: Company Viewing Trade Job
**Setup**: Log in as company, search for trade jobs
**Expected**:
- ✅ Can see trade job listings
- ✅ Can save trade jobs (heart button visible)
- ✅ Can see message button
- ✅ Can send messages about trade jobs
- ✅ Can apply to trade jobs

### Scenario 3: Contractor Viewing Vacancy
**Setup**: Log in as contractor, search for vacancies
**Expected**:
- ✅ Can see vacancy listings
- ✅ Can save vacancies
- ❌ Cannot see message button
- ❌ Cannot apply (blocked with error message)

### Scenario 4: Professional/Homeowner Viewing Vacancy
**Setup**: Log in as jobseeker or homeowner, search for vacancies
**Expected**:
- ✅ Can see vacancy listings
- ✅ Can save vacancies
- ✅ Can see message button
- ✅ Can send messages
- ✅ Can apply to vacancies

### Scenario 5: Professional Viewing Trade Job (BLOCKED - Already Exists)
**Setup**: Log in as professional, search for trade jobs
**Expected**:
- ✅ Can see trade job listings
- ✅ Can save trade jobs
- ✅ Can see message button
- ❌ Cannot apply (already blocked - "Jobseekers cannot apply to Trade Jobs")

---

## Error Messages

### Application Block (Companies/Contractors on Vacancies)
```
Businesses cannot apply for vacancy jobs. Vacancy jobs are employment positions for individual jobseekers. If you're looking to hire professionals or tradespeople, please post a job in the relevant section.
```

### Application Block (Jobseekers on Trade Jobs - Already Exists)
```
Jobseekers cannot apply to Trade Jobs. Trade Jobs are for businesses and tradespeople offering services. Please browse the Vacancies section for employment opportunities.
```

### Application Block (Homeowners on Trade Jobs - Already Exists)
```
Homeowners cannot apply to Trade Jobs. Trade Jobs are for businesses and tradespeople offering services. If you need a service, you can post a Trade Job instead.
```

---

## Files Modified

1. **components/job-application-form.tsx**
   - Lines 225-232: Added company/contractor block for vacancies

2. **components/job-card.tsx**
   - Line 91: Added `userType` state
   - Lines 235-256: Added user type fetching
   - Lines 597-613: Conditional message button rendering

---

## Business Logic Summary

### Vacancy Jobs (is_tradespeople_job = false)
**Who can apply**:
- ✅ Professionals (jobseekers)
- ✅ Homeowners
- ❌ Companies (BLOCKED)
- ❌ Contractors (BLOCKED)

**Who can message**:
- ✅ Professionals (jobseekers)
- ✅ Homeowners
- ❌ Companies (button hidden)
- ❌ Contractors (button hidden)

### Trade Jobs (is_tradespeople_job = true)
**Who can apply**:
- ❌ Professionals (BLOCKED - already exists)
- ❌ Homeowners (BLOCKED - already exists)
- ✅ Companies
- ✅ Contractors

**Who can message**:
- ✅ Everyone (professionals, homeowners, companies, contractors)

---

## Why This Matters

### Problem
Companies were able to apply to vacancy jobs (employment positions) which doesn't make business sense:
- Vacancies are for hiring employees
- Companies don't apply for jobs, they post them
- This created confusion and invalid applications

### Solution
- **Application block**: Clear error message explaining the restriction
- **Message button hiding**: Cleaner UI, prevents confusion
- **Maintains flexibility**: Companies can still message about trade jobs and in other contexts

### User Experience
- **For companies**: Clearer separation between job types, less confusion
- **For job posters**: No invalid applications from businesses
- **For the platform**: More meaningful interactions, better data quality

---

## Rollback Instructions

If issues arise:

1. **Remove application block** (emergency):
   ```typescript
   // In job-application-form.tsx, comment out lines 225-232
   /*
   if (!job.is_tradespeople_job && (userType === 'company' || userType === 'contractor')) {
     ...
   }
   */
   ```

2. **Show message button for everyone**:
   ```typescript
   // In job-card.tsx, remove conditional (lines 597-601, 613)
   // Just keep the Button element
   <Button
     variant="outline"
     size="sm"
     className="h-9 w-9 sm:h-7 sm:w-7 p-0 touch-manipulation"
     onClick={(e) => {
       e.stopPropagation()
       handleContactClick()
     }}
   >
     <MessageCircle className="h-4 w-4 sm:h-3 sm:w-3" />
   </Button>
   ```

---

## Notes

- The message button hiding is **UI-only** - companies can still message via other routes (messages page, profile pages)
- This is intentional - we only want to hide the button in search results to reduce confusion
- The application block is **enforced at the API level** - cannot be bypassed
- Both blocks work independently - even if message button shows, application is still blocked

---

## Summary

✅ **Application Block**: Companies/contractors cannot apply to vacancies (error message shown)

✅ **Message Button Hide**: Companies/contractors don't see message button on vacancy listings

✅ **Scope Limited**: Restrictions ONLY apply to vacancies, not trade jobs

✅ **Messaging Preserved**: Companies can still message in other contexts

✅ **Clear Communication**: Helpful error messages explain why actions are blocked
