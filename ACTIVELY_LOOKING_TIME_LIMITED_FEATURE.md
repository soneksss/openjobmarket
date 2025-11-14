# Time-Limited "Actively Looking" Feature - Documentation

## Overview
The "Actively Looking" feature has been enhanced to require professionals to manually set a time period for how long they want to remain visible as actively seeking opportunities. This ensures that only genuinely active job seekers appear with priority visibility to employers.

---

## Key Changes

### 1. Time Duration Options
Professionals must choose how long they want to be marked as "Actively Looking":

- **1 Day** - Perfect for urgent job search (⚡)
- **3 Days** - Recommended for active searching (🎯) [RECOMMENDED]
- **5 Days** - Extended visibility period (🚀)
- **7 Days** - Maximum visibility duration (⭐) [PREMIUM ONLY]

### 2. Automatic Expiration
After the selected time period expires:
- The "Actively Looking" status is automatically turned OFF
- Professional must manually log in and renew the status
- Premium visibility benefits are removed until renewed

### 3. Expiration Notifications
Professionals receive warnings when their status is expiring:
- **Within 24 hours**: "Your 'Actively Looking' status expires tomorrow"
- **Within 6 hours**: "Your 'Actively Looking' status expires in X hours"
- **Within 1 hour**: "Your 'Actively Looking' status expires in less than 1 hour!"
- **After expiration**: "Your 'Actively Looking' status has expired. Enable it again to stay visible to employers."

---

## Database Schema Changes

### New Field: `actively_looking_until`

```sql
ALTER TABLE professional_profiles
ADD COLUMN actively_looking_until TIMESTAMP WITH TIME ZONE;
```

**Purpose**: Stores the exact timestamp when the "actively looking" status expires.

**Index**: Created for efficient queries on active professionals:
```sql
CREATE INDEX idx_professional_profiles_actively_looking_until
ON professional_profiles(actively_looking_until)
WHERE actively_looking = true;
```

---

## SQL Functions

### 1. `expire_actively_looking_statuses()`
Automatically disables expired statuses. Should be called periodically (every hour).

```sql
SELECT expire_actively_looking_statuses();
```

**Returns**: Integer count of expired statuses that were disabled.

**What it does**:
- Finds all profiles where `actively_looking = true` and `actively_looking_until < NOW()`
- Sets `actively_looking = false` and `actively_looking_until = NULL`
- Returns count of profiles updated

**Scheduling**:
- Call from application code every hour
- Or use pg_cron extension (if available)

---

### 2. `check_actively_looking_expiration(user_id UUID)`
Checks and expires a specific user's status.

```sql
SELECT check_actively_looking_expiration('user-uuid-here');
```

**Returns**: Boolean
- `true` if status was expired
- `false` if status is not expired or doesn't exist

**Usage**: Call when user logs in or views their dashboard to ensure fresh data.

---

### 3. `get_actively_looking_time_remaining(user_id UUID)`
Gets detailed time remaining information.

```sql
SELECT * FROM get_actively_looking_time_remaining('user-uuid-here');
```

**Returns** (Table):
- `is_active`: boolean - Whether status is currently active
- `expires_at`: timestamp - When it expires
- `minutes_remaining`: integer - Minutes until expiration
- `hours_remaining`: integer - Hours until expiration
- `days_remaining`: integer - Days until expiration

**Usage**: Display countdown timers or remaining time to users.

---

### 4. `get_expiring_soon_notification(user_id UUID)`
Returns notification details if status is expiring within 24 hours.

```sql
SELECT * FROM get_expiring_soon_notification('user-uuid-here');
```

**Returns** (Table):
- `show_notification`: boolean - Whether to show notification
- `message`: text - Notification message
- `hours_remaining`: integer - Hours until expiration

**Usage**: Display warnings in UI when status is expiring soon.

---

## Component Files

### 1. `/components/actively-looking-modal.tsx`
Modal dialog for selecting time duration.

**Props**:
- `isOpen`: boolean - Controls modal visibility
- `onClose`: function - Called when modal is closed
- `onConfirm`: function(days: number) - Called with selected duration
- `isPremium`: boolean - Whether user has premium subscription

**Features**:
- Radio button selection for duration
- Visual indicators (recommended, premium-only)
- Benefits list showing what users get
- Info box explaining the purpose
- Countdown explanation

**Duration Options**:
```typescript
const durationOptions = [
  { value: "1", label: "1 Day", recommended: false, premium: false },
  { value: "3", label: "3 Days", recommended: true, premium: false },
  { value: "5", label: "5 Days", recommended: false, premium: false },
  { value: "7", label: "7 Days", recommended: false, premium: true },
]
```

---

### 2. `/components/professional-dashboard.tsx` (Updated)

**New State Variables**:
```typescript
const [activelyLookingUntil, setActivelyLookingUntil] = useState<Date | null>(
  profile.actively_looking_until ? new Date(profile.actively_looking_until) : null
)
const [showActivelyLookingModal, setShowActivelyLookingModal] = useState(false)
const [expirationWarning, setExpirationWarning] = useState<string | null>(null)
```

**New Handler**:
```typescript
const handleActivelyLookingConfirm = async (days: number) => {
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + days)

  await supabase
    .from("professional_profiles")
    .update({
      actively_looking: true,
      actively_looking_until: expirationDate.toISOString()
    })
    .eq("id", profile.id)
}
```

**Expiration Check (useEffect)**:
- Runs on component mount
- Runs every 60 seconds
- Automatically disables expired status
- Shows expiration warnings

---

## User Experience Flow

### Enabling "Actively Looking"

1. **Professional goes to Dashboard**
   - Sees "Actively Looking" toggle switch
   - Toggle is OFF by default

2. **Professional toggles ON**
   - Modal appears: "Enable 'Actively Looking'"
   - Shows 4 duration options (1, 3, 5, 7 days)
   - 3 days is pre-selected as recommended
   - 7 days option is locked for non-premium users

3. **Professional selects duration**
   - Sees benefits list
   - Sees explanation about manual renewal
   - Clicks "Activate for X Days" button

4. **Status is activated**
   - Modal closes
   - Toggle shows ON
   - Expiration date/time displayed
   - Professional now appears with:
     - Bold name in search results
     - Green priority badge
     - Premium crown (if premium)
     - Top of search rankings

### Status Active Period

**Dashboard Display**:
```
✓ Actively looking for opportunities
  Expires: 12/15/2024 at 3:45 PM
```

**If expiring within 24 hours**:
```
⚠️ Your "Actively Looking" status expires in 6 hours
```

**If expired**:
```
⚠️ Your 'Actively Looking' status has expired. Enable it again to stay visible to employers.
```

### Renewing Status

1. **Professional logs in**
   - Automatic expiration check runs
   - If expired, toggle automatically turns OFF
   - Warning message appears

2. **Professional clicks toggle ON again**
   - Modal appears again
   - Selects new duration
   - Status is renewed

---

## Premium vs Free Users

### Free Users (Basic/Starter Plans)
- Can activate "Actively Looking" for: **1, 3, or 5 days**
- Get standard priority benefits:
  - Bold profile name
  - Priority search ranking
  - Green visibility indicator

### Premium Users
- Can activate for: **1, 3, 5, or 7 days** (full week!)
- Get enhanced priority benefits:
  - Extra-bold profile name
  - Crown badge
  - Higher priority ranking
  - Premium benefits card on profile
  - Priority support indicator

---

## Technical Implementation Details

### Frontend Expiration Check

```typescript
useEffect(() => {
  const checkExpiration = async () => {
    if (activelyLooking && activelyLookingUntil) {
      const now = new Date()
      const expirationDate = new Date(activelyLookingUntil)

      if (expirationDate <= now) {
        // Expire the status
        setActivelyLooking(false)
        setActivelyLookingUntil(null)
        setExpirationWarning("Your 'Actively Looking' status has expired...")

        // Update database
        await supabase
          .from("professional_profiles")
          .update({ actively_looking: false, actively_looking_until: null })
          .eq("id", profile.id)
      } else {
        // Calculate hours until expiry
        const hoursUntilExpiry = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60)

        // Show warning if within 24 hours
        if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 0) {
          setExpirationWarning(`Your "Actively Looking" status expires in ${Math.floor(hoursUntilExpiry)} hours`)
        }
      }
    }
  }

  checkExpiration()
  const interval = setInterval(checkExpiration, 60000) // Check every minute
  return () => clearInterval(interval)
}, [activelyLooking, activelyLookingUntil])
```

### Backend Scheduled Job

**Option 1: Application Code (Recommended)**
```typescript
// Run every hour via cron job or scheduled task
import { createClient } from '@supabase/supabase-js'

export async function expireActivelyLookingStatuses() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key
  )

  const { data, error } = await supabase.rpc('expire_actively_looking_statuses')

  if (error) {
    console.error('Error expiring statuses:', error)
  } else {
    console.log(`Expired ${data} actively looking statuses`)
  }
}
```

**Option 2: PostgreSQL pg_cron Extension**
```sql
-- If pg_cron is enabled
SELECT cron.schedule(
  'expire-actively-looking-statuses',
  '0 * * * *',  -- Every hour at minute 0
  'SELECT expire_actively_looking_statuses();'
);
```

---

## UI/UX Design

### Colors
- **Active Green**: `text-green-600`, `bg-green-600`
- **Warning Amber**: `text-amber-600`, `bg-amber-50`
- **Expired Red**: `text-red-600`
- **Premium Gold**: `from-amber-400 to-yellow-500`

### Icons
- **Active Status**: `Zap` (lightning bolt)
- **Time/Expiration**: `Clock`
- **Premium**: `Crown`
- **Check/Benefit**: `CheckCircle2`
- **Warning**: `AlertCircle`

### Typography
- **Active Badge**: Bold, green, stands out
- **Expiration Date**: Small, gray, informational
- **Warning Text**: Bold, amber, attention-grabbing
- **Modal Title**: Large, prominent

---

## Testing Checklist

### Functionality Tests
- [ ] Modal appears when toggling "Actively Looking" ON
- [ ] Can select each duration option (1, 3, 5 days)
- [ ] 7-day option is locked for non-premium users
- [ ] 7-day option is available for premium users
- [ ] Expiration date is correctly calculated and stored
- [ ] Toggle shows ON after activation
- [ ] Expiration date/time displays correctly

### Expiration Tests
- [ ] Status automatically expires after selected duration
- [ ] Toggle automatically turns OFF when expired
- [ ] Warning appears within 24 hours of expiration
- [ ] Warning updates as time passes (every minute)
- [ ] Expired message appears after expiration
- [ ] Professional can renew status after expiration

### Database Tests
- [ ] `actively_looking_until` field stores correct timestamp
- [ ] `expire_actively_looking_statuses()` function works
- [ ] `check_actively_looking_expiration()` returns correct values
- [ ] `get_actively_looking_time_remaining()` calculates correctly
- [ ] `get_expiring_soon_notification()` returns correct notifications

### Search Visibility Tests
- [ ] Active professionals appear with priority ranking
- [ ] Active professionals have bold names
- [ ] Active professionals have green badge
- [ ] Expired professionals lose priority ranking
- [ ] Expired professionals revert to normal display

### Premium Tests
- [ ] Free users cannot select 7 days
- [ ] Premium users can select 7 days
- [ ] Premium users get extended benefits
- [ ] Premium badge displays for premium users

---

## Monitoring & Analytics

### Metrics to Track

1. **Activation Rate**
   - % of professionals who enable "Actively Looking"
   - Most popular duration selection (1, 3, 5, or 7 days)

2. **Renewal Rate**
   - % of professionals who renew after expiration
   - Average time between expiration and renewal

3. **Engagement**
   - Employer interaction with "actively looking" professionals
   - Message rate comparison: active vs inactive professionals

4. **Premium Conversion**
   - % of free users who select 7 days (shows interest)
   - Conversion rate to premium to unlock 7-day option

### Database Queries for Monitoring

**Active Status Count**:
```sql
SELECT COUNT(*) FROM professional_profiles
WHERE actively_looking = true
AND actively_looking_until > NOW();
```

**Expiring Soon Count**:
```sql
SELECT COUNT(*) FROM professional_profiles
WHERE actively_looking = true
AND actively_looking_until BETWEEN NOW() AND NOW() + INTERVAL '24 hours';
```

**Duration Distribution**:
```sql
SELECT
  CASE
    WHEN EXTRACT(EPOCH FROM (actively_looking_until - NOW())) / 86400 <= 1 THEN '1 day'
    WHEN EXTRACT(EPOCH FROM (actively_looking_until - NOW())) / 86400 <= 3 THEN '3 days'
    WHEN EXTRACT(EPOCH FROM (actively_looking_until - NOW())) / 86400 <= 5 THEN '5 days'
    ELSE '7 days'
  END as duration,
  COUNT(*) as count
FROM professional_profiles
WHERE actively_looking = true
AND actively_looking_until > NOW()
GROUP BY duration;
```

---

## Maintenance

### Scheduled Tasks

**Hourly Task** (Required):
```bash
# Add to cron or task scheduler
0 * * * * curl -X POST https://your-domain.com/api/cron/expire-actively-looking
```

**Daily Monitoring** (Recommended):
- Check how many statuses expired
- Verify automatic expiration is working
- Review error logs for any issues

### Common Issues

**Issue**: Statuses not expiring automatically
**Solution**: Verify scheduled task is running, check server logs

**Issue**: Wrong expiration time calculated
**Solution**: Check timezone settings, ensure consistent UTC usage

**Issue**: Modal not appearing
**Solution**: Check browser console, verify component is imported

---

## Future Enhancements

Potential improvements:

1. **Email Notifications**
   - Send email 24 hours before expiration
   - Send email when status expires
   - Include "Renew Now" button in email

2. **SMS Notifications** (Premium)
   - Text message 1 hour before expiration
   - Quick renewal via text reply

3. **Auto-Renewal Option** (Premium)
   - Toggle to automatically renew
   - Charge premium fee for auto-renewal
   - Always stay active without manual intervention

4. **Custom Duration**
   - Allow users to set custom days (e.g., 4 days)
   - Calendar picker for exact expiration date

5. **Snooze Feature**
   - Temporarily pause "Actively Looking"
   - Resume later without losing remaining time

6. **Activity Boost**
   - Extend duration by interacting with platform
   - +1 day for every 5 job applications
   - Gamification element

---

## Migration Instructions

### Step 1: Run SQL Migration

```bash
# Connect to your database
psql -h your-host -U your-user -d your-database

# Run the migration file
\i ADD_ACTIVELY_LOOKING_EXPIRATION.sql
```

**Expected Output**:
```
ALTER TABLE
CREATE INDEX
CREATE FUNCTION
...
NOTICE:  Successfully added actively_looking_until field and expiration functions
```

### Step 2: Update Application Code

Files already updated:
- ✅ [components/actively-looking-modal.tsx](components/actively-looking-modal.tsx) - NEW
- ✅ [components/professional-dashboard.tsx](components/professional-dashboard.tsx) - UPDATED
- ✅ [hooks/use-premium-status.ts](hooks/use-premium-status.ts) - Already exists

### Step 3: Set Up Scheduled Job

Choose one option:

**Option A: Node.js/TypeScript Application**
```typescript
// api/cron/expire-actively-looking/route.ts
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: count } = await supabase.rpc('expire_actively_looking_statuses')

  return Response.json({ expired: count })
}
```

Then add to cron:
```bash
0 * * * * curl -X POST https://your-domain.com/api/cron/expire-actively-looking
```

**Option B: Enable pg_cron Extension**
```sql
-- Contact Supabase support or your DB admin to enable pg_cron
-- Then run:
SELECT cron.schedule(
  'expire-actively-looking-statuses',
  '0 * * * *',
  'SELECT expire_actively_looking_statuses();'
);
```

### Step 4: Test

1. Go to professional dashboard
2. Toggle "Actively Looking" ON
3. Select 1 day duration
4. Verify expiration date displays
5. Wait for expiration (or manually update DB for testing)
6. Verify status automatically turns OFF

---

## Summary

The time-limited "Actively Looking" feature ensures:

✅ **Active Engagement** - Only genuinely active job seekers get priority visibility
✅ **Manual Renewal** - Professionals must intentionally maintain their status
✅ **Flexible Duration** - Choose 1, 3, 5, or 7 days (premium)
✅ **Automatic Expiration** - No manual intervention needed to expire
✅ **Clear Communication** - Warnings and notifications keep users informed
✅ **Premium Incentive** - 7-day option encourages premium subscriptions

This feature improves the quality of "actively looking" professionals shown to employers, ensuring they see candidates who are currently engaged and seeking opportunities.
