# Analytics Debug Guide

## Overview

This guide provides a comprehensive solution for debugging analytics data issues in the Open Job Market platform. The analytics system has been enhanced with detailed logging, error handling, and a dedicated debug dashboard.

## 🔧 Tools Created

### 1. Analytics Debug Dashboard
**Location**: `http://localhost:3009/admin/debug`
**File**: `app/admin/debug/page.tsx`

A comprehensive debug interface that:
- ✅ Tests all database table accessibility
- ✅ Runs all analytics queries individually
- ✅ Shows detailed error messages and execution times
- ✅ Displays sample data from each table
- ✅ Provides database permissions status

### 2. Enhanced Analytics Components
**File**: `components/analytics-components.tsx`

All analytics components now include:
- 🔍 Detailed console logging with `[ANALYTICS-KPI]` prefix
- 📊 Query result validation and error handling
- 🚨 Graceful fallback to default values on errors
- 📈 Sample data logging for debugging

### 3. Database Schema Fix Script
**File**: `ANALYTICS_MISSING_TABLES_FIX.sql`

Creates missing tables required for analytics:
- 📋 `job_applications` table with RLS policies
- 💬 `messages` table with proper indexing
- 🔍 `admin_audit_log` table for system tracking
- 🔗 Foreign key relationships and triggers
- 📊 Performance indexes

## 🚀 How to Use

### Step 1: Access Debug Dashboard
1. Log in as admin user
2. Navigate to **Admin Panel > Debug** (in sidebar)
3. Click "Re-run Diagnostic" to test all systems

### Step 2: Check Browser Console
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for logs starting with `[ANALYTICS-KPI]` or `[DEBUG]`
4. Review any error messages

### Step 3: Fix Database Issues (if needed)
If tables are missing or have permission issues:
1. Run the `ANALYTICS_MISSING_TABLES_FIX.sql` script in your database
2. Ensure admin user has proper permissions
3. Re-run the debug diagnostic

## 🐛 Common Issues & Solutions

### Issue 1: "Companies: 0" when companies exist
**Solution**: ✅ Already fixed - Updated user type filtering from "employer" to "company"

### Issue 2: Missing Tables Error
**Symptoms**:
- Error messages like "relation does not exist"
- Empty analytics cards

**Solution**:
1. Run `ANALYTICS_MISSING_TABLES_FIX.sql`
2. Check debug dashboard for table status
3. Verify all tables show as "exists: true"

### Issue 3: Permission Denied Errors
**Symptoms**:
- "insufficient privilege" errors
- RLS policy blocking access

**Solution**:
1. Ensure user is logged in as admin
2. Check admin user_type in users table
3. Verify RLS policies allow admin access

### Issue 4: Empty Data
**Symptoms**:
- All metrics show 0
- No errors in console

**Solution**:
1. Check if tables have actual data
2. Review sample data in debug dashboard
3. Verify data insertion is working

## 📊 Debug Dashboard Features

### Table Status Section
- ✅ Green checkmark: Table accessible with row count
- ❌ Red X: Table missing or inaccessible
- 📋 Sample data preview
- 🔐 Permission status

### Query Tests Section
- ✅ Green badge: Query successful
- ❌ Red badge: Query failed with error details
- ⏱️ Execution time tracking
- 📊 Result data preview

### Overview Cards
- 📈 Quick summary of system health
- 🔢 Total table count vs accessible
- ⚡ Query success rate
- 👥 User and job counts

## 🔍 Console Logging

All analytics queries now log detailed information:

```javascript
[ANALYTICS-KPI] Starting KPI data fetch...
[ANALYTICS-KPI] Users data: { count: 5, userTypes: ['admin', 'company', 'professional'] }
[ANALYTICS-KPI] Jobs data: { count: 12, activeJobs: 8 }
[ANALYTICS-KPI] Applications count: 45
[ANALYTICS-KPI] Messages count: 23
[ANALYTICS-KPI] Final KPI data: { totalUsers: 5, totalCompanies: 2, ... }
```

## 🛠️ Database Schema Verification

The debug dashboard automatically checks:
- ✅ `users` table
- ✅ `jobs` table
- ✅ `company_profiles` table
- ✅ `professional_profiles` table
- ❓ `job_applications` table (may need creation)
- ❓ `messages` table (may need creation)
- ❓ `admin_audit_log` table (may need creation)

## 🔧 Quick Fixes

### If analytics show all zeros:
1. Visit `/admin/debug`
2. Check which tables are failing
3. Run database fix script if needed
4. Verify admin authentication

### If specific queries fail:
1. Check console for `[ANALYTICS-KPI]` errors
2. Review error details in debug dashboard
3. Verify table structure matches expectations

### If permissions are denied:
1. Confirm admin login status
2. Check user_type in database
3. Verify RLS policies are correct

## 📈 Success Indicators

When everything is working correctly, you should see:
- ✅ All tables showing as "exists: true"
- ✅ All query tests showing green badges
- ✅ Actual data counts instead of zeros
- ✅ No error messages in browser console

## 🚀 Next Steps

After running the debug tools:
1. **If issues found**: Fix database/permission problems
2. **If everything works**: Analytics should display correctly
3. **For ongoing monitoring**: Use debug dashboard periodically

The debug dashboard provides ongoing visibility into the health of your analytics system and can help quickly identify issues as they arise.

---

*Generated for Open Job Market Analytics Debug System*