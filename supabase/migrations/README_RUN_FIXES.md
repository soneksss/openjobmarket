# How to Apply Database Fixes

## Quick Instructions

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your openjobmarket project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Execute the Fix Script**
   - Open the file: `APPLY_ALL_FIXES.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" button

4. **Verify Results**
   - Check the output messages in the SQL Editor
   - You should see success messages for both parts:
     - Part 1: Cross-role job applications
     - Part 2: Message trigger fixes

## What Gets Fixed

### Fix 1: Cross-Role Job Applications
- Enables companies to apply to tasks posted by homeowners
- Enables professionals to apply to jobs posted by companies
- Updates database schema with `company_id` column
- Creates new RLS policies for both applicant types

### Fix 2: Message Sending
- Fixes database trigger error: "receiver_id field does not exist"
- Updates triggers to use correct field name: `recipient_id`
- Removes outdated triggers and functions

## After Running

Test the following:

1. **As a Company**: Try applying to a task
2. **Send a Message**: Contact a tradespeople company
3. **Check Dashboard**: Verify applications show up correctly

## Files Included

- `APPLY_ALL_FIXES.sql` - Main comprehensive fix script (run this one)
- `FIX_CROSS_ROLE_JOB_APPLICATIONS.sql` - Individual fix for applications (optional)
- `FIX_MESSAGES_TRIGGER_RECEIVER_ID.sql` - Individual fix for messages (optional)

**Note**: You only need to run `APPLY_ALL_FIXES.sql` - it includes both fixes.
