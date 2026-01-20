# Email Verification Not Working - Fix Guide

**Date**: 2026-01-20
**Issue**: New users receiving Magic Links instead of OTP codes (6-digit codes valid for 10 minutes)

---

## Root Cause Analysis

The signup is using **Magic Link flow** (click link in email) instead of **OTP flow** (enter 6-digit code).

### Current Flow (Magic Link):
1. User submits signup form
2. `supabase.auth.signUp()` called with `emailRedirectTo` option
3. Supabase sends email with **magic link** (click to verify)
4. User clicks link → redirects to `/auth/callback`
5. Callback route calls `complete_user_profile_after_verification()`
6. User redirected to dashboard

### Desired Flow (OTP):
1. User submits signup form
2. `supabase.auth.signUp()` called **without** `emailRedirectTo`
3. Supabase sends email with **6-digit OTP code** (valid 10 minutes)
4. User enters code on `/auth/verify-otp` page
5. `supabase.auth.verifyOtp()` called to verify code
6. Profile created, user redirected to dashboard

### What Needs to Change:
- ✅ **DONE**: Removed `emailRedirectTo` from signup call
- ✅ **DONE**: Created OTP verification page
- ⚠️ **TODO**: Enable OTP in Supabase settings (you must do this)

---

## ⚠️ ACTION REQUIRED: Enable OTP in Supabase

**You need to change ONE setting in Supabase dashboard to enable OTP codes instead of magic links.**

### Quick Fix (Do This Now):

1. Go to: **[Supabase Dashboard](https://app.supabase.com/project/mklxzrvhanlndkyeteog)** → **Authentication** → **Providers**

2. Click on **"Email"** provider

3. Look for setting labeled:
   - **"Secure email change enabled"** or
   - **"Enable email OTP"** or
   - **"Email OTP verification"**

4. **Toggle it ON** ✅

5. Click **Save** or **Update**

6. Done! Now emails will contain 6-digit codes instead of links.

---

## Detailed Fix Steps (Supabase Dashboard)

### 1. Enable OTP for Email Authentication

Go to: **Supabase Dashboard** → **Authentication** → **Providers** → **Email**

1. Find **Email** provider
2. Ensure it's **ENABLED**
3. Check **"Enable email confirmations"** is toggled ON
4. **IMPORTANT**: Look for **"Secure email change enabled"** or **"Enable email OTP"** setting
   - If you see "Secure email change enabled", toggle it ON (this enables OTP)
   - This changes the email flow from magic links to OTP codes
5. Save changes

**Note**: The setting name may vary by Supabase version. Look for:
- "Secure email change"
- "Enable email OTP"
- "Email OTP verification"

### 2. Add Redirect URLs to Allowed List (Optional for OTP Flow)

Go to: **Supabase Dashboard** → **Authentication** → **URL Configuration**

**Note**: For OTP flow, redirect URLs are less critical since users enter codes directly in the app. However, keep your production URLs:
```
https://www.openjobmarket.com/auth/callback
https://www.openjobmarket.com/br/auth/callback
```

For development, you can optionally add:
```
http://localhost:3005/auth/verify-otp
http://localhost:3000/auth/verify-otp
```

### 3. Check Email Templates

Go to: **Supabase Dashboard** → **Authentication** → **Email Templates**

Find **"Confirm signup"** template and verify:
- Template is **enabled**
- Subject line exists (e.g., "Confirm your signup")
- Template content exists
- `{{ .ConfirmationURL }}` is present in the template

### 4. Check Email Provider Settings

Go to: **Supabase Dashboard** → **Project Settings** → **Auth**

Scroll to **SMTP Settings**:

**Option A: Use Supabase's Built-in Email (Recommended for Development)**
- If using Supabase's default email service, no SMTP configuration needed
- **Limitation**: Supabase's default email has rate limits and may be blocked by some email providers
- Emails sent from: `noreply@mail.app.supabase.co`

**Option B: Use Custom SMTP (Recommended for Production)**
- Enable custom SMTP
- Configure your email provider (Gmail, SendGrid, AWS SES, etc.)
- Test SMTP connection

### 5. Check Rate Limits

Go to: **Supabase Dashboard** → **Authentication** → **Rate Limits**

Verify email sending is not rate-limited:
- **Email sending rate limit**: Should be reasonable (e.g., 10/hour minimum)
- If rate limit is 0, emails won't send

---

## Code Changes Made

### 1. Updated Signup Form (`components/sign-up-form.tsx`)

**Changed**:
- Removed `emailRedirectTo` option from `signUp()` call
- Changed redirect from `/auth/sign-up-success` to `/auth/verify-otp`
- Pass email as query parameter to OTP page

**Before**:
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    data: { user_type: userType }
  }
})
// Redirect to /auth/sign-up-success
```

**After**:
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { user_type: userType }
  }
})
// Redirect to /auth/verify-otp?email=xxx
```

### 2. Created OTP Verification Page (`app/auth/verify-otp/page.tsx`)

**Features**:
- 6-digit code input field (numeric only)
- Calls `supabase.auth.verifyOtp()` to verify code
- Resend code button
- 10-minute expiry notice
- Error handling
- After verification, calls `complete_user_profile_after_verification()`
- Role-based redirect to appropriate dashboard

**User Flow**:
1. User fills signup form → submits
2. Redirected to `/auth/verify-otp?email=xxx`
3. Receives email with 6-digit code
4. Enters code in input field
5. Clicks "Verify Email"
6. Profile created automatically
7. Redirected to dashboard

---

## Testing the OTP Flow

### Test 1: Complete OTP Signup Flow

1. **Go to signup page**: `http://localhost:3005/auth/sign-up`

2. **Fill out form**:
   - Use a **real email address** you can access
   - Create a password
   - Select user type (professional/company/etc.)
   - Submit

3. **Check redirect**:
   - Should redirect to: `/auth/verify-otp?email=your@email.com`
   - Page should show email address and 6-digit code input

4. **Check email inbox** (and spam folder!):
   - Subject should be: "Confirm your signup" or similar
   - Email should contain a **6-digit code** (e.g., `123456`)
   - Code is valid for **10 minutes**

5. **Enter code**:
   - Type the 6-digit code in the input field
   - Click "Verify Email"

6. **Verify success**:
   - Should show loading spinner
   - Profile should be created automatically
   - Should redirect to appropriate dashboard:
     - Professional → `/dashboard/professional`
     - Company → `/dashboard/company`
     - Homeowner → `/dashboard/homeowner`
     - Contractor → `/dashboard/contractor`

### Test 2: Test Resend Code

1. Follow Test 1 steps 1-3
2. On OTP page, click "Resend Code" button
3. Should show green success message
4. Check email for new 6-digit code
5. Enter new code and verify

### Test 3: Test Expired Code

1. Follow Test 1 steps 1-4
2. **Wait 11 minutes** (code expires after 10 minutes)
3. Try to enter the old code
4. Should show error: "Invalid or expired code"
5. Click "Resend Code" to get a new one

### Test 4: Test Invalid Code

1. Follow Test 1 steps 1-3
2. Enter a random 6-digit code (e.g., `999999`)
3. Click "Verify Email"
4. Should show error message
5. Try again with correct code from email

### Test 5: Check Browser Console Logs

Open browser DevTools console and look for these logs:

**During OTP verification**:
```
[OTP] User verified successfully: {user_id}
[OTP] Profile creation result: {success: true, user_id: xxx, ...}
```

**On error**:
```
[OTP] Verification error: Invalid or expired token
```

### Test 6: Verify Database Trigger
Check if user was created in database:
```sql
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

If `email_confirmed_at` is NULL, email verification hasn't completed.

---

## Code Configuration (Optional)

### Add Redirect URL to .env

Create this environment variable to make the redirect URL explicit:

**File**: `.env.local` (create if doesn't exist)
```env
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3005/auth/callback
```

This ensures the redirect URL is consistent across all environments.

---

## Common Issues & Solutions

### Issue 1: Email Goes to Spam
**Solution**:
- Check spam folder
- Use custom SMTP with verified domain
- Add SPF, DKIM records to your domain

### Issue 2: "Invalid Redirect URL" Error
**Solution**: Add the redirect URL to Supabase allowed list (see Fix Step 2)

### Issue 3: Email Template Broken
**Solution**:
- Go to Email Templates
- Click "Confirm signup"
- Ensure `{{ .ConfirmationURL }}` exists in template
- Reset to default if needed

### Issue 4: Rate Limited
**Solution**:
- Wait for rate limit window to expire
- Increase rate limits in Supabase dashboard
- Use custom SMTP for higher limits

### Issue 5: Wrong Email Provider in Development
**Symptom**: Emails sent but never received
**Solution**:
- Use a real email address (not temp email services)
- Some email providers block Supabase's default sender
- Switch to custom SMTP

---

## OTP Flow Checklist

- [ ] **Email provider is ENABLED** in Supabase
- [ ] **"Enable email confirmations" is ON**
- [ ] **"Secure email change" or "Enable email OTP" is ON** ⚠️ CRITICAL
- [ ] "Confirm signup" email template is enabled
- [ ] Email template contains OTP code placeholder (not URL)
- [ ] SMTP is configured (or using Supabase default)
- [ ] Rate limits allow email sending
- [ ] Code changes deployed (signup form + OTP page)
- [ ] Tested complete signup flow
- [ ] Verified 6-digit code in email (not link)
- [ ] Verified code works and profile created
- [ ] Checked spam folder

---

## How OTP Verification Works (Technical Details)

### OTP Email Verification Flow:

1. **Signup** (`components/sign-up-form.tsx:44-53`):
   ```typescript
   await supabase.auth.signUp({
     email,
     password,
     options: {
       data: { user_type: userType }
       // NO emailRedirectTo - enables OTP mode
     }
   })
   // Redirect to /auth/verify-otp?email=xxx
   ```

2. **Trigger Fires** (`migration 20260117000008`):
   - Creates **minimal** user record in `public.users`
   - Does **NOT** create profile yet (waiting for verification)

3. **OTP Email Sent** (by Supabase):
   - Contains **6-digit code** (e.g., `123456`)
   - Code valid for **10 minutes**
   - No link to click

4. **User Enters Code** (`app/auth/verify-otp/page.tsx`):
   - User types 6-digit code
   - Clicks "Verify Email"
   - Calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`

5. **Verification Handler** (`app/auth/verify-otp/page.tsx:39-100`):
   - Verifies OTP code with Supabase
   - Calls `complete_user_profile_after_verification(user.id)`
   - Creates full user profile
   - Redirects to dashboard based on user_type

### Why Minimal User Record First?

The OTP flow (implemented in migration `20260117000008`) ensures profiles are only created for **verified users**:
- **Old flow**: Create profile immediately → orphaned profiles if email never verified
- **New flow**: Create profile AFTER verification → clean database, no orphans

---

## Quick Fix for Development (Skip Email Verification)

**⚠️ WARNING: Only for local development testing!**

If you need to test signup flow without email verification:

Go to: **Supabase Dashboard** → **Authentication** → **Providers** → **Email**

Toggle **OFF**: "Enable email confirmations"

This will:
- ✅ Allow immediate login without verification
- ✅ Auto-confirm email on signup
- ❌ **NOT SECURE** - never use in production!
- ❌ Users can sign up with fake emails

**Remember to re-enable email confirmations for production!**

---

## Expected Behavior After OTP Fix

### Successful OTP Signup Flow:
1. User fills signup form → submits
2. Redirected to `/auth/verify-otp` page
3. Page shows: "We've sent a 6-digit code to your email"
4. User receives email within 1-5 minutes with **6-digit code**
5. User enters code in input field
6. User clicks "Verify Email"
7. Profile created automatically
8. Redirected to appropriate dashboard based on user type

### What User Sees in Email (OTP):
```
Subject: Confirm your signup

Welcome to OpenJobMarket!

Your verification code is:

123456

This code expires in 10 minutes.

If you didn't request this code, please ignore this email.
```

**Key Difference**: Email contains a **CODE** (123456), not a **LINK**.

---

## Monitoring & Debugging

### Check Supabase Logs

Go to: **Supabase Dashboard** → **Logs** → **Auth Logs**

Look for:
- Signup events
- Email sending events
- Errors or failures

### Check Application Logs

In terminal running Next.js dev server, look for:
```
[v0] Auth callback - user authenticated, completing profile creation
[v0] Auth callback - profile creation result: {success: true, user_id: xxx}
```

### Database Queries

Check user creation:
```sql
-- Check if user exists
SELECT id, email, created_at, email_confirmed_at, confirmed_at
FROM auth.users
WHERE email = 'user@example.com';

-- Check if profiles were created
SELECT u.email, pp.id as prof_id, cp.id as comp_id, hp.id as home_id
FROM users u
LEFT JOIN professional_profiles pp ON pp.user_id = u.id
LEFT JOIN company_profiles cp ON cp.user_id = u.id
LEFT JOIN homeowner_profiles hp ON hp.user_id = u.id
WHERE u.email = 'user@example.com';
```

If user exists but profiles are NULL, verification hasn't completed.

---

## Production Checklist

Before deploying to production:

- [ ] Use custom SMTP (not Supabase default)
- [ ] Configure SPF/DKIM records for your domain
- [ ] Use professional "from" email (e.g., noreply@yourdomain.com)
- [ ] Customize email templates with branding
- [ ] Set appropriate rate limits
- [ ] Add production redirect URLs to allowed list
- [ ] Test email delivery to multiple email providers (Gmail, Outlook, Yahoo)
- [ ] Enable email confirmations (never skip in production!)
- [ ] Set up email monitoring/alerts

---

## Summary

### ✅ Code Changes Made (Complete)
1. ✅ Updated `components/sign-up-form.tsx` - removed `emailRedirectTo`, redirect to OTP page
2. ✅ Created `app/auth/verify-otp/page.tsx` - OTP verification page with 6-digit code input
3. ✅ Updated documentation with OTP flow details

### ⚠️ Supabase Settings (You Must Do This)
1. **Go to Supabase Dashboard** → Authentication → Providers → Email
2. **Find "Secure email change enabled"** or **"Enable email OTP"**
3. **Toggle it ON** ✅
4. **Save changes**

### 🎯 What This Fixes
- ❌ **Before**: Users received magic links (click to verify)
- ✅ **After**: Users receive 6-digit codes (enter to verify)
- ⏱️ **Code validity**: 10 minutes
- 🔐 **More secure**: Codes can't be accidentally clicked by email scanners

### 🧪 Testing
1. Sign up with new email at `http://localhost:3005/auth/sign-up`
2. Get redirected to `/auth/verify-otp` page
3. Check email for 6-digit code (not link!)
4. Enter code and verify
5. Profile created, redirect to dashboard

### 📝 Files Changed
- `components/sign-up-form.tsx` (lines 44-123) - OTP flow signup
- `app/auth/verify-otp/page.tsx` (new file) - OTP verification UI
- `EMAIL_VERIFICATION_FIX.md` (updated) - Complete documentation

---

## Quick Start (TL;DR)

**Problem**: Emails send magic links instead of 6-digit OTP codes

**Solution**:
1. ✅ Code updated (done)
2. ⚠️ Enable "Secure email change" in Supabase Email provider settings (you do this)
3. ✅ Test signup → receive code → enter code → verified

**That's it!** The code is ready. You just need to flip one switch in Supabase dashboard.
