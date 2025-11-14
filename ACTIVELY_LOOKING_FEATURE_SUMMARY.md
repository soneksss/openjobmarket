# ⏰ Time-Limited "Actively Looking" Feature - Quick Summary

## 🎯 What Changed

**Before**: Professionals could toggle "Actively Looking" ON/OFF freely - it stayed ON forever

**Now**: Professionals must choose a duration (1, 3, 5, or 7 days) and manually renew when it expires

---

## 🚀 Why This Change?

✅ **Ensures Active Engagement** - Only genuinely active job seekers get priority visibility
✅ **Better Quality for Employers** - Employers see professionals who are currently seeking (not months-old inactive profiles)
✅ **Premium Incentive** - Free users get 5 days max, Premium get 7 days
✅ **Automatic Cleanup** - No need to manually moderate inactive "actively looking" profiles

---

## 📋 Duration Options

| Duration | Description | Icon | Availability |
|----------|-------------|------|--------------|
| **1 Day** | Perfect for urgent job search | ⚡ | Everyone |
| **3 Days** | Recommended for active searching | 🎯 | Everyone (Recommended) |
| **5 Days** | Extended visibility period | 🚀 | Everyone |
| **7 Days** | Maximum visibility duration | ⭐ | Premium Only |

---

## 🎨 User Experience

### When Professional Enables "Actively Looking"

```
1. Professional clicks toggle ON
2. Modal appears: "Enable 'Actively Looking'"
3. Professional selects duration (1, 3, 5, or 7 days)
4. Professional sees benefits list
5. Professional clicks "Activate for X Days"
6. Status is enabled with expiration date
```

### Dashboard Display

**When Active:**
```
✓ Priority visibility
  Actively looking for opportunities
  Expires: 12/15/2024 at 3:45 PM
```

**When Expiring Soon (within 24 hours):**
```
⚠️ Your "Actively Looking" status expires in 6 hours
```

**When Expired:**
```
⚠️ Your 'Actively Looking' status has expired.
   Enable it again to stay visible to employers.
```

---

## 🔄 Automatic Expiration

- **Frontend Check**: Every 60 seconds on dashboard
- **Backend Check**: Every hour via scheduled job
- **Automatic Disabling**: Status turns OFF when expired
- **No Manual Work**: System handles everything automatically

---

## 💎 Benefits of Being "Actively Looking"

1. **Priority Search Ranking** - Appear first in employer searches
2. **Bold Profile Name** - Stand out with enhanced visibility
3. **Green Priority Badge** - Show employers you're ready to work
4. **Enhanced Profile** - Premium professionals get crown badge

---

## 🗂️ Files Created/Modified

### New Files
- ✅ `components/actively-looking-modal.tsx` - Duration selection modal
- ✅ `ADD_ACTIVELY_LOOKING_EXPIRATION.sql` - Database migration
- ✅ `ACTIVELY_LOOKING_TIME_LIMITED_FEATURE.md` - Full documentation
- ✅ `RUN_THIS_SQL_FOR_TIME_LIMITED_ACTIVELY_LOOKING.txt` - SQL instructions

### Modified Files
- ✅ `components/professional-dashboard.tsx` - Added expiration logic and modal
- ✅ `hooks/use-premium-status.ts` - Already existed for premium checks

---

## 📊 Database Changes

### New Column
```sql
ALTER TABLE professional_profiles
ADD COLUMN actively_looking_until TIMESTAMP WITH TIME ZONE;
```

### New Functions
- `expire_actively_looking_statuses()` - Auto-disable expired statuses
- `check_actively_looking_expiration(user_id)` - Check specific user
- `get_actively_looking_time_remaining(user_id)` - Get time remaining
- `get_expiring_soon_notification(user_id)` - Get expiration warnings

---

## ⚙️ Setup Instructions

### 1. Run SQL Migration
```bash
# Open Supabase SQL Editor
# Copy contents of: ADD_ACTIVELY_LOOKING_EXPIRATION.sql
# Paste and run
```

### 2. Set Up Hourly Job
**Option A - Application Cron:**
```bash
0 * * * * curl -X POST https://your-domain.com/api/cron/expire-actively-looking
```

**Option B - pg_cron Extension:**
```sql
SELECT cron.schedule(
  'expire-actively-looking-statuses',
  '0 * * * *',
  'SELECT expire_actively_looking_statuses();'
);
```

### 3. Test
1. Go to professional dashboard
2. Toggle "Actively Looking" ON
3. Select 1 day for quick testing
4. Verify expiration date displays
5. Wait or manually test expiration

---

## 🔍 How It Works Technically

### When Professional Enables Status

```typescript
// 1. Professional selects duration (e.g., 3 days)
const expirationDate = new Date()
expirationDate.setDate(expirationDate.getDate() + 3)

// 2. Update database
await supabase
  .from("professional_profiles")
  .update({
    actively_looking: true,
    actively_looking_until: expirationDate.toISOString()
  })
  .eq("id", profile.id)

// 3. Status is now active for 3 days
```

### Expiration Check (Frontend)

```typescript
// Runs every 60 seconds
useEffect(() => {
  const checkExpiration = async () => {
    if (activelyLooking && activelyLookingUntil) {
      const now = new Date()
      const expirationDate = new Date(activelyLookingUntil)

      if (expirationDate <= now) {
        // Expire the status
        setActivelyLooking(false)
        await supabase.from("professional_profiles")
          .update({ actively_looking: false, actively_looking_until: null })
      }
    }
  }

  checkExpiration()
  const interval = setInterval(checkExpiration, 60000)
  return () => clearInterval(interval)
}, [activelyLooking, activelyLookingUntil])
```

### Expiration Check (Backend - Hourly)

```sql
-- Called every hour via cron
UPDATE professional_profiles
SET
  actively_looking = false,
  actively_looking_until = NULL
WHERE
  actively_looking = true
  AND actively_looking_until < NOW()
```

---

## 📈 Expected Impact

### For Professionals
- ✅ More targeted visibility to employers
- ✅ Clear time limits create urgency
- ✅ Encourages regular engagement with platform
- ✅ Premium users get longer visibility (7 days)

### For Employers
- ✅ See only genuinely active job seekers
- ✅ Higher response rates from "actively looking" professionals
- ✅ More confidence in reaching out
- ✅ Better quality candidates

### For Platform
- ✅ Increased engagement (professionals return to renew)
- ✅ Higher conversion to premium (for 7-day option)
- ✅ Better data quality ("actively looking" is accurate)
- ✅ Natural cleanup of inactive profiles

---

## 🎯 Key Metrics to Track

| Metric | What It Measures | Target |
|--------|------------------|--------|
| **Activation Rate** | % of professionals who enable feature | >30% |
| **Renewal Rate** | % who renew after expiration | >50% |
| **Average Duration** | Most popular duration selection | 3 days |
| **7-Day Requests** | Free users trying 7-day (locked) | Track for premium conversion |
| **Employer Engagement** | Messages to "actively looking" professionals | Higher than normal |

---

## 🚨 Important Notes

### For Users
1. **Manual Renewal Required** - Status does NOT auto-renew
2. **Notification Before Expiry** - Get warnings 24h, 6h, 1h before
3. **Premium Benefit** - 7 days only for premium subscribers
4. **No Interruption** - Can renew anytime, even after expiration

### For Administrators
1. **Scheduled Job Required** - Must run `expire_actively_looking_statuses()` every hour
2. **Monitor Execution** - Check logs to ensure expiration job runs successfully
3. **Database Index** - Created for performance on expiration queries
4. **No Manual Cleanup** - System handles expiration automatically

---

## 🎉 Success Criteria

Feature is working correctly when:

✅ Modal appears when toggling "Actively Looking" ON
✅ Professionals can select duration (1, 3, 5, or 7 days)
✅ Expiration date displays on dashboard
✅ Warnings appear within 24 hours of expiration
✅ Status automatically turns OFF when expired
✅ Professional can renew status anytime
✅ Premium users can select 7 days
✅ Free users cannot select 7 days (locked)
✅ Search results prioritize active professionals
✅ Expired professionals lose priority visibility

---

## 📞 Support & Troubleshooting

### Status Not Expiring?
**Check**: Is the scheduled job running every hour?
**Solution**: Verify cron job or application scheduler is active

### Modal Not Appearing?
**Check**: Browser console for errors
**Solution**: Ensure component is properly imported

### 7-Day Option Available for Free Users?
**Check**: Premium status hook returning correct value
**Solution**: Verify `usePremiumStatus` is checking subscriptions correctly

### Warnings Not Showing?
**Check**: `actively_looking_until` field has correct timestamp
**Solution**: Verify expiration date calculation in `handleActivelyLookingConfirm`

---

## 🎓 For Developers

### Component Architecture
```
professional-dashboard.tsx
├── useEffect: Check expiration every 60s
├── handleActivelyLookingToggle: Show modal on enable
├── handleActivelyLookingConfirm: Save duration to DB
└── ActivelyLookingModal
    ├── Duration selection (1, 3, 5, 7 days)
    ├── Benefits list
    ├── Premium lock for 7 days
    └── onConfirm callback
```

### State Management
```typescript
const [activelyLooking, setActivelyLooking] = useState(false)
const [activelyLookingUntil, setActivelyLookingUntil] = useState<Date | null>(null)
const [expirationWarning, setExpirationWarning] = useState<string | null>(null)
const [showActivelyLookingModal, setShowActivelyLookingModal] = useState(false)
```

### API Calls
```typescript
// Enable with duration
await supabase
  .from("professional_profiles")
  .update({
    actively_looking: true,
    actively_looking_until: expirationDate.toISOString()
  })
  .eq("id", profile.id)

// Disable
await supabase
  .from("professional_profiles")
  .update({
    actively_looking: false,
    actively_looking_until: null
  })
  .eq("id", profile.id)

// Check expiration (backend)
await supabase.rpc('expire_actively_looking_statuses')
```

---

## ✨ Final Notes

This feature significantly improves the quality of the "Actively Looking" indicator by ensuring only truly active job seekers maintain the status. It creates a win-win:

- **Professionals** get targeted visibility when they're actually seeking
- **Employers** see high-quality, engaged candidates
- **Platform** benefits from increased engagement and premium conversions

The automatic expiration removes the burden of manual moderation while ensuring data accuracy. The time-limited nature creates healthy urgency and encourages professionals to stay engaged with the platform.

**Status**: ✅ Fully implemented and ready for production
**Migration Required**: Yes - Run `ADD_ACTIVELY_LOOKING_EXPIRATION.sql`
**Scheduled Job Required**: Yes - Every hour
**Backward Compatible**: Yes - Existing profiles work normally
