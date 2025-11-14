# 6-Month Free Subscription Setup Guide

## Overview
This guide explains how to set up and activate the 6-month free Premium subscription for all new company sign-ups.

## Features
When a company signs up, they automatically receive:
- ✅ **6 months FREE Premium subscription**
- ✅ **Unlimited job postings**
- ✅ **Unlimited professional contacts**
- ✅ **Priority listing in search results**
- ✅ **Welcome congratulations modal** with all the benefits listed

After 6 months, companies are automatically downgraded to the free Starter Plan.

## Installation Steps

### Step 1: Run the SQL Update Script

You need to run the SQL script to update the subscription system from 3 months to 6 months.

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `UPDATE_TO_6_MONTH_SUBSCRIPTION.sql`
5. Click **Run** to execute

**Option B: Using Supabase CLI**
```bash
supabase db execute --file UPDATE_TO_6_MONTH_SUBSCRIPTION.sql
```

### Step 2: Verify the Setup

After running the SQL script, verify that everything is set up correctly:

1. **Check the subscription plans:**
```sql
SELECT name, duration_days, job_limit, contact_limit
FROM subscription_plans
WHERE user_type = 'company';
```

2. **Check the trigger exists:**
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'auto_assign_subscription_on_signup';
```

### Step 3: Test the Flow

1. **Create a test company account:**
   - Go to `/auth/sign-up`
   - Sign up as a company (employer)
   - Complete the onboarding

2. **Verify the subscription was assigned:**
   - After completing onboarding, you should be redirected to the company dashboard
   - The congratulations modal should appear automatically
   - Check the subscription in the database:
   ```sql
   SELECT us.*, sp.name as plan_name
   FROM user_subscriptions us
   JOIN subscription_plans sp ON us.plan_id = sp.id
   WHERE us.user_id = 'YOUR_USER_ID'
   ORDER BY us.created_at DESC;
   ```

3. **Expected result:**
   - You should see an **active** Premium subscription lasting 6 months
   - You should see a **scheduled** Starter Plan subscription that starts in 6 months
   - The modal should display the congratulations message with all benefits

## How It Works

### Automatic Assignment Flow

1. **User Signs Up** as a company
2. **Trigger Fires** (`auto_assign_subscription_on_signup`)
3. **Function Executes** (`assign_starter_plan_to_company()`)
4. **Two Subscriptions Created:**
   - **Premium (Active)**: 6 months, status = 'active'
   - **Starter (Scheduled)**: Starts after 6 months, status = 'scheduled'
5. **User Completes Onboarding**
6. **Dashboard Loads**
7. **Modal Checks** if user should see welcome message
8. **Modal Displays** congratulations with benefits
9. **User Clicks "Get Started"**
10. **Welcome Marked as Shown** (won't show again)

### Database Functions Used

- `assign_starter_plan_to_company()` - Assigns subscriptions on user creation
- `should_show_welcome_message(user_id)` - Checks if user should see the modal
- `get_user_welcome_message(user_id)` - Retrieves the welcome message
- `mark_welcome_message_shown(user_id)` - Marks the message as shown
- `process_expired_subscriptions()` - Auto-downgrades expired subscriptions (run daily)

## Customization

### Change Subscription Duration

To change from 6 months to a different duration, edit line 35 in `UPDATE_TO_6_MONTH_SUBSCRIPTION.sql`:

```sql
-- Current: 6 months
premium_end_date := NOW() + INTERVAL '6 months';

-- Examples:
-- 3 months: premium_end_date := NOW() + INTERVAL '3 months';
-- 1 year: premium_end_date := NOW() + INTERVAL '1 year';
-- 90 days: premium_end_date := NOW() + INTERVAL '90 days';
```

### Change Welcome Message

Edit the welcome message in line 48 of `UPDATE_TO_6_MONTH_SUBSCRIPTION.sql`:

```sql
'welcome_message', '🎉 Your custom message here!',
```

### Customize Modal Appearance

Edit the modal component at `components/subscription-welcome-modal.tsx`:
- Change colors, icons, or layout
- Modify the feature list
- Update the CTA button text

## Maintenance

### Daily Cron Job for Auto-Downgrade

Set up a daily cron job to process expired subscriptions:

**Option 1: Supabase Edge Function**
```sql
-- Run this daily via cron job or edge function
SELECT process_expired_subscriptions();
```

**Option 2: GitHub Actions / External Cron**
Create a scheduled task that calls:
```bash
curl -X POST 'YOUR_SUPABASE_URL/rest/v1/rpc/process_expired_subscriptions' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Monitor Subscriptions

Check active subscriptions:
```sql
-- See all active premium subscriptions
SELECT u.email, us.start_date, us.end_date, sp.name
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
  AND sp.name = 'Premium Plan'
ORDER BY us.end_date ASC;
```

## Troubleshooting

### Modal Not Showing

1. **Check if trigger is active:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'auto_assign_subscription_on_signup';
```

2. **Check if subscription was created:**
```sql
SELECT * FROM user_subscriptions WHERE user_id = 'YOUR_USER_ID';
```

3. **Check if welcome was already shown:**
```sql
SELECT payment_data->'welcome_shown'
FROM user_subscriptions
WHERE user_id = 'YOUR_USER_ID' AND status = 'active';
```

4. **Reset the welcome flag:**
```sql
UPDATE user_subscriptions
SET payment_data = payment_data - 'welcome_shown'
WHERE user_id = 'YOUR_USER_ID' AND status = 'active';
```

### Subscription Not Created

1. **Verify trigger exists:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'auto_assign_subscription_on_signup';
```

2. **Manually assign subscription:**
```sql
-- Get user ID
SELECT id FROM users WHERE email = 'test@example.com';

-- Then run the assignment function manually
-- (This requires the user to already exist in the users table)
```

3. **Check logs:**
Look for errors in the Supabase logs dashboard

## Files Modified

- `UPDATE_TO_6_MONTH_SUBSCRIPTION.sql` - SQL script to update subscription duration
- `components/subscription-welcome-modal.tsx` - Congratulations modal component
- `components/company-dashboard.tsx` - Integrated modal into dashboard

## Support

If you encounter any issues:
1. Check Supabase logs for errors
2. Verify all SQL functions are created
3. Ensure the trigger is active
4. Test with a fresh company account
5. Check browser console for frontend errors

## Benefits Overview

The congratulations modal displays these benefits:

### 🎉 6-Month Premium Subscription Includes:

1. **Post Unlimited Jobs**
   - Create as many job postings as needed
   - No monthly or daily limits

2. **Contact Unlimited People**
   - Reach out to unlimited professionals
   - No contact restrictions

3. **Priority Listing in Search Results**
   - Job postings appear at the top
   - Maximum visibility for hiring

After 6 months, users automatically move to the free Starter Plan (5 jobs/month, 10 contacts/month) but can upgrade back to Premium anytime.
