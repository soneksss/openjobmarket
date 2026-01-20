# Email Verification Not Working - Fix Guide

**Date**: 2026-01-20
**Issue**: New users not receiving verification emails during signup

---

## Root Cause Analysis

The signup code is **correct** and properly calls `supabase.auth.signUp()`. The issue is in the **Supabase project configuration**, not the code.

### What Happens During Signup:
1. User submits signup form
2. `supabase.auth.signUp()` called with `emailRedirectTo` option
3. Supabase should send verification email
4. User clicks link → redirects to `/auth/callback`
5. Callback route calls `complete_user_profile_after_verification()`
6. User redirected to dashboard

### Where It's Failing:
Step 3 - Supabase is **not sending** the verification email.

---

## Fix Steps (Supabase Dashboard)

### 1. Check Email Authentication Settings

Go to: **Supabase Dashboard** → **Authentication** → **Providers**

1. Find **Email** provider
2. Ensure it's **ENABLED**
3. Check **"Enable email confirmations"** is toggled ON
4. Check **"Secure email change"** (optional but recommended)

### 2. Add Redirect URLs to Allowed List

Go to: **Supabase Dashboard** → **Authentication** → **URL Configuration**

Add these URLs to **Redirect URLs** list:
```
http://localhost:3005/auth/callback
http://localhost:3000/auth/callback
https://yourdomain.com/auth/callback
```

**IMPORTANT**: If your redirect URL is not in this list, Supabase will **BLOCK** the email from being sent as a security measure.

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

## Testing After Configuration

### Test 1: Signup with New Email
1. Use a **real email address** you can access
2. Fill out signup form
3. Submit
4. Check email inbox (and spam folder!)
5. Click verification link
6. Should redirect to dashboard

### Test 2: Check Server Logs
Look for these console logs during signup:
```
[v0] Auth callback route handler started
[v0] Auth callback - code: true
[v0] Auth callback - user authenticated, completing profile creation
[v0] Auth callback - profile creation result: {success: true, ...}
```

### Test 3: Verify Database Trigger
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

## Verification Checklist

- [ ] Email provider is **ENABLED** in Supabase
- [ ] "Enable email confirmations" is **ON**
- [ ] Redirect URL `http://localhost:3005/auth/callback` is in **allowed list**
- [ ] "Confirm signup" email template is **enabled**
- [ ] Email template contains `{{ .ConfirmationURL }}`
- [ ] SMTP is configured (or using Supabase default)
- [ ] Rate limits allow email sending
- [ ] Tested with real email address
- [ ] Checked spam folder
- [ ] Verified user created in `auth.users` table

---

## How Verification Works (Technical Details)

### Email Verification Flow:

1. **Signup** (`components/sign-up-form.tsx:44-54`):
   ```typescript
   await supabase.auth.signUp({
     email,
     password,
     options: {
       emailRedirectTo: `${window.location.origin}/auth/callback`,
       data: { user_type: userType }
     }
   })
   ```

2. **Trigger Fires** (`migration 20260117000008`):
   - Creates **minimal** user record in `public.users`
   - Does **NOT** create profile yet (waiting for verification)

3. **Email Sent** (by Supabase):
   - Contains magic link with verification code
   - Link format: `{emailRedirectTo}?code=xxx`

4. **User Clicks Link**:
   - Browser opens: `http://localhost:3005/auth/callback?code=xxx`

5. **Callback Handler** (`app/auth/callback/route.ts:17-36`):
   - Exchanges code for session
   - Calls `complete_user_profile_after_verification(user.id)`
   - Creates full user profile
   - Redirects to dashboard

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

## Expected Behavior After Fix

### Successful Signup Flow:
1. User fills signup form → submits
2. Redirected to `/auth/sign-up-success` page
3. Page shows: "Check your email for verification link"
4. User receives email within 1-5 minutes
5. User clicks link in email
6. Browser opens callback URL
7. Profile created automatically
8. Redirected to appropriate dashboard based on user type

### What User Sees in Email:
```
Subject: Confirm your signup

Welcome to OpenJobMarket!

Please confirm your email address by clicking the link below:

[Confirm your email]

This link expires in 24 hours.
```

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

✅ **Code is correct** - No code changes needed
❌ **Supabase configuration issue** - Fix in dashboard
🔧 **Primary fix**: Enable email confirmations + add redirect URL to allowed list
📧 **Alternative**: Use custom SMTP for reliable delivery
🧪 **Testing**: Use real email, check spam folder, verify in database

The most common issue is **redirect URL not in allowed list** - this is a security feature in Supabase that blocks email sending if the redirect URL is not whitelisted.
