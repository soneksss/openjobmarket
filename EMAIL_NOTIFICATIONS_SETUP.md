# Email Notifications Setup Guide

This guide explains how to set up email notifications for OpenJobMarket.

## Overview

Email notifications are sent for the following events:
- **New Messages**: When a user receives a new message
- **Job Applications**: When someone applies to a job posting
- **Job Offers**: When a professional receives a job offer or inquiry
- **Application Status Changes**: When an application status is updated (future)

Users can control their notification preferences from the dashboard settings page.

## Prerequisites

1. A Resend account (free tier includes 100 emails/day, 3,000/month)
2. A verified email domain or use the test domain

## Step 1: Sign Up for Resend

1. Go to [https://resend.com](https://resend.com)
2. Click "Sign Up" and create a free account
3. Verify your email address

## Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Go to "API Keys" in the sidebar
3. Click "Create API Key"
4. Give it a name (e.g., "OpenJobMarket Production")
5. Select permissions: "Sending access"
6. Click "Create"
7. **Copy the API key** (you won't be able to see it again!)

## Step 3: Add Environment Variables

Add these variables to your `.env.local` file:

```env
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email sender address (must be verified in Resend)
EMAIL_FROM="OpenJobMarket <noreply@openjobmarket.com>"

# Your site URL (for links in emails)
NEXT_PUBLIC_SITE_URL=https://openjobmarket.com
```

### Development/Testing

For development, you can use Resend's onboarding email:

```env
EMAIL_FROM="OpenJobMarket <onboarding@resend.dev>"
```

This allows you to test without verifying a domain, but emails will only be sent to your own verified email address.

## Step 4: Verify Your Domain (Production Only)

For production, you need to verify your domain in Resend:

1. Go to "Domains" in Resend dashboard
2. Click "Add Domain"
3. Enter your domain (e.g., `openjobmarket.com`)
4. Add the DNS records Resend provides to your domain's DNS settings
5. Wait for verification (usually takes a few minutes)
6. Once verified, you can send emails from any address at that domain

## Step 5: Run Database Migrations

Apply the notification preferences migration to your Supabase database:

1. Go to your Supabase dashboard
2. Navigate to "SQL Editor"
3. Run the migration file: `supabase/migrations/20260129000005_add_email_notification_preferences.sql`
4. Verify the tables were created:
   - `user_notification_preferences`
   - `notification_log`

Alternatively, if you have Supabase CLI installed:

```bash
supabase migration up
```

## Step 6: Test Email Notifications

1. **Test New Message Notification**:
   - Log in as User A
   - Send a message to User B
   - User B should receive an email notification

2. **Test Job Application Notification**:
   - Log in as a professional
   - Apply to a job posting
   - The job poster should receive an email notification

3. **Check Notification Settings**:
   - Go to `/account/settings`
   - Scroll down to "Email Notifications"
   - Toggle settings on/off
   - Save and test again

## Step 7: Monitor Email Delivery

1. Go to your Resend dashboard
2. Click "Emails" to see all sent emails
3. Check delivery status, opens, clicks, etc.
4. Review any bounces or complaints

## Troubleshooting

### Emails not being sent

1. **Check environment variables**:
   ```bash
   # In your terminal
   echo $RESEND_API_KEY
   ```

2. **Check server logs**:
   - Look for `[EMAIL]` prefixed console logs
   - Check for error messages

3. **Verify API key**:
   - Make sure you copied the full key
   - Check that it starts with `re_`
   - Try creating a new key

### Emails going to spam

1. **Verify your domain** (don't use resend.dev in production)
2. **Set up SPF, DKIM, and DMARC records** (Resend provides these)
3. **Use a professional email address** (not noreply@)
4. **Add an unsubscribe link** (already included in templates)

### User not receiving emails

1. **Check user's email is correct** in the database
2. **Check notification preferences**:
   - User may have disabled that notification type
   - Check `user_notification_preferences` table
3. **Check spam folder**
4. **Check Resend dashboard** for delivery status

### Testing in development

If `RESEND_API_KEY` is not set, the system will:
- Log email details to the console instead of sending
- Return success (fail silently)
- This allows development without setting up Resend

## Email Templates

Email templates are located in `lib/email/templates.ts`:

- `newMessageEmail()` - New message notification
- `jobApplicationEmail()` - Job application notification
- `jobOfferEmail()` - Job offer/inquiry notification
- `genericMessageEmail()` - Fallback template

To customize templates:
1. Edit the HTML and text in `templates.ts`
2. Test changes by sending yourself an email
3. Check rendering in multiple email clients

## Rate Limits

**Resend Free Tier**:
- 100 emails per day
- 3,000 emails per month
- 1 domain
- 3 team members

**Resend Pro** ($20/month):
- 50,000 emails per month
- Additional emails: $1 per 1,000
- Multiple domains
- Email analytics

## Notification Preferences

Users can manage their preferences at:
- URL: `/account/settings#notifications`
- Component: `components/notification-settings.tsx`

Available preferences:
- ✅ Email on new message
- ✅ Email on job application
- ✅ Email on job offer
- ✅ Email on application status change

## Database Schema

### user_notification_preferences table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| email_on_new_message | BOOLEAN | Enable message notifications |
| email_on_job_application | BOOLEAN | Enable application notifications |
| email_on_job_offer | BOOLEAN | Enable job offer notifications |
| email_on_application_status_change | BOOLEAN | Enable status change notifications |
| email_digest_frequency | VARCHAR | instant/daily/weekly/never |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### notification_log table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| notification_type | VARCHAR | Type of notification |
| notification_method | VARCHAR | email/sms/push |
| recipient_email | VARCHAR | Email address |
| subject | TEXT | Email subject |
| status | VARCHAR | sent/failed/pending |
| error_message | TEXT | Error details if failed |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMPTZ | Sent timestamp |

## API Routes

### Send Message Notification
- **Endpoint**: `POST /api/notifications/send-message-notification`
- **Body**:
  ```json
  {
    "recipientId": "uuid",
    "senderId": "uuid",
    "conversationId": "uuid",
    "messageSubject": "string",
    "messageContent": "string"
  }
  ```

### Send Application Notification
- **Endpoint**: `POST /api/notifications/send-application-notification`
- **Body**:
  ```json
  {
    "jobPosterId": "uuid",
    "applicantId": "uuid",
    "jobId": "uuid",
    "jobTitle": "string",
    "applicationId": "uuid",
    "applicationMessage": "string (optional)"
  }
  ```

## Support

For issues with:
- **Resend**: [Resend Support](https://resend.com/support)
- **Supabase**: [Supabase Support](https://supabase.com/support)
- **OpenJobMarket**: Check server logs and notification_log table

## Security Notes

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Monitor usage** in Resend dashboard
5. **Set up alerts** for unusual activity

## Future Enhancements

Potential additions:
- SMS notifications (via Twilio)
- Push notifications (via Firebase)
- Digest emails (daily/weekly summaries)
- In-app notifications
- Email preferences per conversation
- Notification scheduling
