# Professional & Company 6-Month Free Subscription Setup

## Overview
This system provides **6 months FREE Premium subscription** to ALL new users (both companies and professionals) when admin sets subscriptions to "free".

## Features

### For Companies
✅ **6 months FREE Premium** including:
- Post unlimited jobs
- Contact unlimited professionals
- Priority listing in search results
- Advanced analytics dashboard
- Featured job postings

After 6 months → Auto-downgrade to free **Starter Plan** (5 jobs, 10 contacts per month)

### For Professionals
✅ **6 months FREE Premium** including:
- **"Actively Looking" toggle** - Let employers know you're seeking opportunities
- **Bold profile name** - Stand out in search results
- **Priority search ranking** - Appear at the top of results
- **Green visibility indicator** - Show you're active and ready
- **Enhanced profile features** - Advanced customization and analytics

After 6 months → Auto-downgrade to free **Basic Plan** (standard visibility)

## Installation

### Step 1: Run the SQL Script

Run `UPDATE_TO_6_MONTH_SUBSCRIPTION_WITH_PROFESSIONALS.sql` in your Supabase SQL editor:

```bash
# Using Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy/paste the SQL script
4. Click Run

# Using Supabase CLI:
supabase db execute --file UPDATE_TO_6_MONTH_SUBSCRIPTION_WITH_PROFESSIONALS.sql
```

### Step 2: Verify Setup

Check that subscription plans were created:

```sql
-- Check company plans
SELECT name, price, duration_days, job_limit, contact_limit
FROM subscription_plans
WHERE user_type = 'company';

-- Check professional plans
SELECT name, price, duration_days, features
FROM subscription_plans
WHERE user_type = 'professional';
```

Expected results:
- **Company**: Starter Plan (free) + Premium Plan (£10/month)
- **Professional**: Basic Plan (free) + Premium Plan (£5/month)

### Step 3: Test the Flow

#### Testing Company Sign-Up:
1. Sign up as a new company at `/auth/sign-up`
2. Complete onboarding
3. You should see the congratulations modal with company benefits
4. Verify subscription in database:
   ```sql
   SELECT us.*, sp.name
   FROM user_subscriptions us
   JOIN subscription_plans sp ON us.plan_id = sp.id
   WHERE us.user_id = 'YOUR_USER_ID'
   ORDER BY us.created_at DESC;
   ```

#### Testing Professional Sign-Up:
1. Sign up as a new professional at `/auth/sign-up`
2. Complete onboarding
3. You should see the congratulations modal with professional benefits
4. Verify subscription in database (same query as above)

## Modal Differences

### Company Modal Shows:
```
🎉 Congratulations!
You now have a free 6-month subscription!

With this gift, you can:
- Post unlimited jobs
- Contact unlimited people
- Enjoy priority listing in search results
```

### Professional Modal Shows:
```
🎉 Congratulations!
You've been upgraded to a 6-month premium subscription!

Enjoy enhanced visibility and tools to boost your professional presence:
- "Actively Looking" toggle
- Bold profile name
- Priority search ranking
- Green visibility indicator
- Enhanced profile features
```

## Database Schema

### Subscription Plans Table

**Company Plans:**
- Starter Plan: £0/month, 5 jobs, 10 contacts (permanent)
- Premium Plan: £10/month, unlimited jobs & contacts (30 days)

**Professional Plans:**
- Basic Plan: £0/month, standard visibility (permanent)
- Premium Plan: £5/month, enhanced features (30 days)

### User Subscriptions Flow

When a user signs up:
1. **Trigger fires**: `auto_assign_premium_subscription_on_signup`
2. **Function creates TWO subscriptions**:
   - **Active Premium**: 6 months, status='active'
   - **Scheduled Basic/Starter**: Starts in 6 months, status='scheduled'
3. **Payment data includes**:
   - `type`: 'signup_bonus'
   - `welcome_message`: Custom message for user type
   - `is_promotional`: true
   - `auto_downgrade_to`: 'Basic Plan' or 'Starter Plan'

## Automatic Downgrade

After 6 months, run this function to process expired subscriptions:

```sql
SELECT process_expired_subscriptions();
```

This should be run daily via:
- **Supabase Edge Function** (recommended)
- **Cron job** calling your API
- **GitHub Actions** scheduled workflow

Example cron setup:
```yaml
# .github/workflows/process-subscriptions.yml
name: Process Expired Subscriptions
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/rest/v1/rpc/process_expired_subscriptions' \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

## Files Modified

### SQL Scripts
- ✅ `UPDATE_TO_6_MONTH_SUBSCRIPTION_WITH_PROFESSIONALS.sql` - Complete subscription system

### Components
- ✅ `components/subscription-welcome-modal.tsx` - Dual-mode modal for companies & professionals
- ✅ `components/company-dashboard.tsx` - Added welcome modal
- ✅ `components/professional-dashboard.tsx` - Added welcome modal

### Features by User Type

| Feature | Company Free | Company Premium | Professional Free | Professional Premium |
|---------|-------------|-----------------|-------------------|---------------------|
| Job Posting | 5/month | Unlimited | N/A | N/A |
| Contact Professionals | 10/month | Unlimited | N/A | N/A |
| Priority Listing | ❌ | ✅ | ❌ | ✅ |
| "Actively Looking" Toggle | N/A | N/A | ❌ | ✅ |
| Bold Profile Name | N/A | N/A | ❌ | ✅ |
| Green Indicator | N/A | N/A | ❌ | ✅ |
| Analytics | Basic | Advanced | ❌ | ✅ |
| Featured Content | ❌ | ✅ | ❌ | ✅ |

## Customization

### Change Subscription Duration

Edit line 136 in the SQL script:

```sql
-- Current: 6 months
premium_end_date := NOW() + INTERVAL '6 months';

-- Examples:
-- 3 months: premium_end_date := NOW() + INTERVAL '3 months';
-- 1 year: premium_end_date := NOW() + INTERVAL '1 year';
```

### Change Welcome Messages

Edit the `welcome_message` field in the SQL script (lines 145-165):

```sql
-- For companies
'welcome_message', 'Your custom message here...',

-- For professionals
'welcome_message', 'Your custom professional message...',
```

### Change Plan Pricing

```sql
-- Update company premium price
UPDATE subscription_plans
SET price = 15.00  -- New price
WHERE name = 'Premium Plan' AND user_type = 'company';

-- Update professional premium price
UPDATE subscription_plans
SET price = 7.00  -- New price
WHERE name = 'Premium Plan' AND user_type = 'professional';
```

## Troubleshooting

### Modal Not Showing

1. **Check if SQL functions exist:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%welcome%';
   ```

2. **Check if subscription was created:**
   ```sql
   SELECT * FROM user_subscriptions
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC;
   ```

3. **Check if welcome was already shown:**
   ```sql
   SELECT payment_data->'welcome_shown'
   FROM user_subscriptions
   WHERE user_id = 'YOUR_USER_ID' AND status = 'active';
   ```

4. **Reset welcome flag:**
   ```sql
   UPDATE user_subscriptions
   SET payment_data = payment_data - 'welcome_shown'
   WHERE user_id = 'YOUR_USER_ID' AND status = 'active';
   ```

### Subscription Not Auto-Created

1. **Check if trigger exists:**
   ```sql
   SELECT * FROM pg_trigger
   WHERE tgname = 'auto_assign_premium_subscription_on_signup';
   ```

2. **Check trigger is enabled:**
   ```sql
   SELECT tgenabled FROM pg_trigger
   WHERE tgname = 'auto_assign_premium_subscription_on_signup';
   ```
   - Should return 'O' for enabled

3. **Re-create trigger:**
   ```sql
   DROP TRIGGER IF EXISTS auto_assign_premium_subscription_on_signup ON users;
   -- Then re-run the trigger creation from the SQL script
   ```

## Monitoring

### Check Active Premium Users

```sql
-- Companies with active premium
SELECT u.email, us.start_date, us.end_date
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE sp.name = 'Premium Plan'
  AND sp.user_type = 'company'
  AND us.status = 'active'
ORDER BY us.end_date ASC;

-- Professionals with active premium
SELECT u.email, us.start_date, us.end_date
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE sp.name = 'Premium Plan'
  AND sp.user_type = 'professional'
  AND us.status = 'active'
ORDER BY us.end_date ASC;
```

### Check Expiring Soon (Next 7 Days)

```sql
SELECT u.email, u.user_type, us.end_date,
       us.end_date - NOW() as time_remaining
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE sp.name = 'Premium Plan'
  AND us.status = 'active'
  AND us.end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY us.end_date ASC;
```

## Support

For issues:
1. Check Supabase logs for errors
2. Verify all SQL functions are created
3. Ensure trigger is active
4. Test with a fresh user account
5. Check browser console for frontend errors

## Summary

✅ **Companies get**: 6 months unlimited jobs & contacts → Free Starter plan
✅ **Professionals get**: 6 months enhanced visibility → Free Basic plan
✅ **Automatic**: Subscriptions assigned on sign-up
✅ **Customizable**: Messages, duration, and pricing
✅ **Monitored**: SQL queries to track usage
