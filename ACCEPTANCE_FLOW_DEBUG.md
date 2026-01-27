# Application Acceptance Flow - Debug Guide

## Issue
Company (Mark Linda - Plumber, Hyde Park) accepted a job application, but the applicant doesn't see the acceptance.

## Expected Flow

### 1. Company Accepts Application
**File**: `components/application-actions.tsx` (lines 33-186)

**What happens**:
1. Company clicks "Accept" button
2. `updateStatus('accepted')` is called
3. Database update: `job_applications.status = 'accepted'`
4. Notification created:
   ```typescript
   {
     user_id: professionalUserId,  // ← This is the auth user ID from professional_profiles.user_id
     type: "application_status_change",
     title: "Application Status Update",
     message: "Your application for [job] has been accepted",
     link_url: `/applications/${applicationId}`,
     is_read: false
   }
   ```
5. Email notification sent (optional, non-blocking)
6. Review interaction verified (if accepted)
7. Page refreshes

### 2. Applicant Should Receive
1. **Notification Bell** (via Realtime):
   - `notification-bell.tsx` listens for `INSERT` on `notifications` table
   - Filter: `user_id=eq.${user.id}`
   - Should show unread count badge

2. **Applications List** (requires manual refresh):
   - `app/dashboard/professional/applications/page.tsx`
   - Server-side rendered, no realtime
   - Shows status with green badge when "accepted"

3. **Messaging Enabled**:
   - Can message company after acceptance

## Critical Points to Check

### Point 1: professionalUserId Value
**Where defined**: `app/applications/[id]/page.tsx:378-382`

```typescript
const applicantUserId = isCompanyApplicant && application.company_profiles
  ? application.company_profiles.user_id
  : isProfessionalApplicant && application.professional_profiles
  ? application.professional_profiles.user_id  // ← Should be auth user ID
  : null
```

**Passed to ApplicationActions**: Line 622
```typescript
professionalUserId={applicantUserId || ""}
```

**SQL Query**: Lines 66-85 fetches:
```sql
professional_profiles (
  id,
  first_name,
  last_name,
  ...
  user_id,  -- ← This is the auth user ID from auth.users
  ...
)
```

### Point 2: Notification Creation
**File**: `components/application-actions.tsx:70-88`

```typescript
const { error: notificationError } = await supabase
  .from("notifications")
  .insert({
    user_id: professionalUserId,  // ← Must match auth.users.id
    type: "application_status_change",
    title: "Application Status Update",
    message: notificationMessage,
    link_url: `/applications/${applicationId}`,
    is_read: false,
  })
```

**Potential issues**:
- ✓ Column name is correct (`link_url` not `link`)
- ? Is `professionalUserId` actually populated?
- ? Is it the correct auth user ID?

### Point 3: Realtime Subscription
**File**: `components/notification-bell.tsx:33-74`

```typescript
const channel = supabase
  .channel('notifications_channel')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${user.id}`,  // ← Must match notification.user_id
  }, (payload) => {
    console.log('[NOTIFICATION-BELL] New notification received:', payload)
    loadNotifications()
  })
  .subscribe((status) => {
    console.log('[NOTIFICATION-BELL] Subscription status:', status)
  })
```

**Potential issues**:
- ? Is user logged in when subscription is created?
- ? Does `user.id` match `professionalUserId` passed to notification?
- ? Is RLS blocking the INSERT from being visible via realtime?

### Point 4: RLS Policies on Notifications
**Check**: Do RLS policies allow:
1. INSERT by company (authenticated user creating notification for another user)
2. SELECT by professional (reading their own notifications)
3. Realtime subscription with user filter

## Testing Steps

### Step 1: Run SQL Debug Query
Run `debug_acceptance_issue.sql` to check:
1. Recent accepted applications
2. Notifications created for those acceptances
3. Mark Linda's company and applications
4. Professional profiles structure

### Step 2: Check Browser Console During Acceptance
**What to look for**:
1. `[APPLICATION-ACTIONS]` logs showing:
   - Status update
   - Notification creation (success/error)
   - Email sending (success/error)
   - Review verification (success/error)

2. `[NOTIFICATION-BELL]` logs showing:
   - Subscription status: "SUBSCRIBED"
   - New notification received

### Step 3: Verify Notification Record
After acceptance, check database:
```sql
SELECT
  id,
  user_id,
  type,
  title,
  message,
  link_url,
  is_read,
  created_at
FROM notifications
WHERE user_id = (
  SELECT user_id
  FROM professional_profiles
  WHERE id = 'PROFESSIONAL_ID_FROM_APPLICATION'
)
ORDER BY created_at DESC
LIMIT 5;
```

### Step 4: Test Realtime Manually
In applicant's browser console:
```javascript
// Check if notification bell subscription is active
// Look for: [NOTIFICATION-BELL] Subscription status: SUBSCRIBED

// Manually trigger notification (as company) and watch for:
// [NOTIFICATION-BELL] New notification received: { ... }
```

## Likely Root Causes

### Cause 1: professionalUserId is NULL or Wrong
**Symptom**: Notification created with wrong/null user_id
**Fix**: Verify query includes `professional_profiles.user_id`
**Check**: Console log shows `professionalUserId` value

### Cause 2: Notification Created but Not Received via Realtime
**Symptom**: Notification exists in DB but bell doesn't update
**Possible reasons**:
- Realtime subscription not active
- User filter mismatch (notification.user_id ≠ current user.id)
- RLS policy blocking realtime event
- WebSocket connection failed

**Fix**: Check notification-bell.tsx subscription and RLS policies

### Cause 3: Applications List Not Refreshing
**Symptom**: Notification received but list still shows "pending"
**Reason**: Server-rendered page, no realtime subscription
**Expected**: User must manually refresh or navigate away and back
**Not a bug**: This is expected behavior for server-rendered pages

### Cause 4: RLS Policy Blocks Notification INSERT
**Symptom**: Notification INSERT returns permission denied
**Fix**: Check notifications table RLS policies
**Required policy**:
```sql
CREATE POLICY "Users can create notifications for others"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);  -- Or specific logic
```

## Testing Checklist

- [ ] Run `debug_acceptance_issue.sql` to check DB state
- [ ] Accept an application and check browser console for `[APPLICATION-ACTIONS]` logs
- [ ] Verify notification record created with correct `user_id`
- [ ] Check applicant's browser console for `[NOTIFICATION-BELL]` logs
- [ ] Verify realtime subscription shows "SUBSCRIBED"
- [ ] Check if new notification received via realtime
- [ ] Manually refresh applications list to see if status is green
- [ ] Test messaging after acceptance

## Next Steps

1. Run the SQL debug query first
2. If notifications exist, issue is with realtime delivery
3. If notifications missing, issue is with creation (wrong user_id or RLS)
4. Check console logs during acceptance for exact error
