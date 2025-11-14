# 4-Role System Implementation Progress

## ✅ COMPLETED

### 1. Database Schema
- Created `IMPLEMENT_4_ROLE_SYSTEM.sql` migration file
- Adds 4 user types: `jobseeker`, `employer`, `contractor`, `homeowner`
- Creates `contractor_profiles` table
- Adds role switching functions:
  - `switch_homeowner_to_jobseeker(user_id)`
  - `switch_contractor_to_employer(user_id)`
- Helper functions:
  - `get_user_dashboard_route(user_id)` - Returns correct dashboard URL
  - `can_user_post_jobs(user_id)` - Checks if user can post jobs

**To Apply:** Run `IMPLEMENT_4_ROLE_SYSTEM.sql` in Supabase SQL Editor

### 2. Homeowner Dashboard Page
- Created `/app/dashboard/homeowner/page.tsx`
- Fetches homeowner profile and jobs
- Passes data to HomeownerDashboard component

## 🚧 IN PROGRESS / TODO

### 3. HomeownerDashboard Component
**File:** `/components/homeowner-dashboard.tsx`

**Structure:**
```typescript
"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
// ... other imports

interface HomeownerProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone?: string
  location: string
  full_address?: string
  latitude?: number
  longitude?: number
  profile_photo_url?: string
  bio?: string
  on_market: boolean
  // Professional fields (only when on_market = true)
  title?: string
  skills?: string[]
  experience_level?: string
  salary_min?: number
  salary_max?: number
  cv_url?: string
  created_at: string
}

interface HomeownerJob {
  id: string
  title: string
  description: string
  category: string
  budget_min?: number
  budget_max?: number
  location: string
  urgency: string
  status: string
  is_active: boolean
  created_at: string
}

export default function HomeownerDashboard({
  user,
  profile,
  jobs,
  stats
}: {
  user: any
  profile: HomeownerProfile
  jobs: HomeownerJob[]
  stats: { totalJobs: number; activeJobs: number }
}) {
  // Left sidebar: Profile card with "Put Me on the Market" button
  // Main content:
  //   - Quick actions: Find Tradesperson, Post Task
  //   - Posted tasks list
  //   - Stats cards
}
```

**Key Features:**
1. Profile sidebar (simplified, no CV/salary fields)
2. **"Put Me on the Market"** button → Opens modal to become jobseeker
3. **Find Tradesperson** button → Opens full-screen map with contractors
4. **Post Task** button → Opens simplified job posting form
5. Task list with 7-day expiry warnings
6. Stats cards

### 4. Contractor Dashboard Page
**File:** `/app/dashboard/contractor/page.tsx`
- Similar structure to company page
- Fetches `contractor_profiles` instead of `company_profiles`
- Shows available homeowner tasks
- **"Post Job"** button to switch to employer mode

### 5. Jobseeker Dashboard Page
**File:** `/app/dashboard/jobseeker/page.tsx`
- Rename/redirect from `/dashboard/professional`
- Same UI as professional dashboard
- Show if user came from homeowner (original_role field)

### 6. Employer Dashboard Page
**File:** `/app/dashboard/employer/page.tsx`
- Rename/redirect from `/dashboard/company`
- Same UI as company dashboard
- Show if user came from contractor (can_hire field)

## 📋 COMPONENTS TO CREATE

### 1. Role Switching Modal
**File:** `/components/role-switching-modal.tsx`

**Homeowner → Jobseeker:**
- Form fields: Title, Skills, Experience Level, Salary Range, CV Upload
- "Complete Profile" button calls `switch_homeowner_to_jobseeker()` function
- Redirects to `/dashboard/jobseeker`

**Contractor → Employer:**
- Simple confirmation modal
- "Enable Job Posting" button calls `switch_contractor_to_employer()` function
- Updates UI to show employer features

### 2. Tradesperson Search Page
**File:** `/components/tradesperson-search.tsx`
- Full-screen map view
- Side panel with contractor list
- Filters:
  - Search radius
  - Language
  - Company / Self-employed
  - Available now
  - 24/7 Service
- Shows contractors on map with green pins
- Click to view profile and send inquiry

### 3. Homeowner Task Posting Form
**File:** `/components/homeowner-task-form.tsx`
- Simplified job posting
- Fields:
  - Title
  - Description
  - Category (dropdown: Plumbing, Electrical, Painting, etc.)
  - Budget range
  - Urgency (Urgent, Normal, Flexible)
  - Preferred start date
  - Location (auto-fill from profile)
- Auto-expires after 7 days
- Creates entry in `homeowner_jobs` table

## 🔄 ROUTING UPDATES NEEDED

### Update middleware/auth logic:
```typescript
// app/middleware.ts or equivalent

const dashboardRoutes = {
  jobseeker: "/dashboard/jobseeker",
  employer: "/dashboard/employer",
  contractor: "/dashboard/contractor",
  homeowner: "/dashboard/homeowner",
  professional: "/dashboard/jobseeker", // legacy
  company: "/dashboard/employer", // legacy
}

function getDashboardRoute(userType: string) {
  return dashboardRoutes[userType] || "/dashboard"
}
```

### Update onboarding flow:
```typescript
// components/onboarding-flow.tsx

// Step 1: Choose category
const categories = [
  { id: "professional", label: "I'm looking for work", roles: ["jobseeker", "homeowner"] },
  { id: "company", label: "I'm hiring", roles: ["employer", "contractor"] }
]

// Step 2: Choose specific role
if (category === "professional") {
  - Jobseeker (Full profile, found by employers)
  - Homeowner (Post small tasks, find tradespeople)
}

if (category === "company") {
  - Employer (Hire workers, post jobs)
  - Contractor (Receive inquiries, find homeowner tasks)
}

// Step 3: Fill profile based on role
```

## 🎨 UI PATTERNS

### Dashboard Headers
```tsx
// All dashboards should have consistent header with role switcher

<div className="flex items-center justify-between mb-4">
  <h1 className="text-2xl font-bold">
    {role === "homeowner" && "Homeowner Dashboard"}
    {role === "jobseeker" && "Jobseeker Dashboard"}
    {role === "contractor" && "Contractor Dashboard"}
    {role === "employer" && "Employer Dashboard"}
  </h1>

  {/* Role switching button */}
  {role === "homeowner" && (
    <Button onClick={() => setShowJobseekerModal(true)}>
      🎯 Put Me on the Market
    </Button>
  )}

  {role === "contractor" && (
    <Button onClick={() => setShowEmployerModal(true)}>
      📋 Post Job
    </Button>
  )}
</div>
```

### Simplified Profile Fields for Homeowner
```tsx
// Only show these fields in homeowner profile:
- First Name
- Last Name
- Phone (optional)
- Location
- Full Address
- Profile Photo

// Do NOT show:
- Title, Skills, Experience, Salary, CV, Portfolio
// These appear only after switching to jobseeker
```

### 7-Day Expiry Warning
```tsx
{job.days_until_expiry <= 2 && (
  <Badge variant="destructive">
    Expires in {job.days_until_expiry} days
  </Badge>
)}
```

## 🗺️ MAP INTEGRATION

### Tradesperson Search Map
- Use existing `ProfessionalMap` component
- Filter for contractors with `is_self_employed = true` OR `company/contractor profiles`
- Show availability indicators (green dot for available_now)
- Side panel shows filtered list
- Click contractor → Show profile modal with "Send Inquiry" button

## 📊 PERMISSIONS MATRIX

| Feature | Jobseeker | Homeowner | Contractor | Employer |
|---------|-----------|-----------|------------|----------|
| Search jobs | ✅ | ✅ | ✅ | ✅ |
| Apply to jobs | ✅ | ❌ | ❌ | ❌ |
| Post jobs | ❌ | ✅ (tasks only) | ❌ (unless switched) | ✅ |
| Found on map | ✅ | ❌ (unless switched) | ✅ | ✅ |
| Hire workers | ❌ | ❌ | ❌ (unless switched) | ✅ |
| Receive inquiries | ✅ | ✅ | ✅ | ✅ |
| Build CV | ✅ | ❌ (unless switched) | ❌ | ❌ |

## 🚀 NEXT STEPS

1. **Run SQL Migration** - Apply IMPLEMENT_4_ROLE_SYSTEM.sql
2. **Create HomeownerDashboard component** - Start with basic layout
3. **Create ContractorDashboard component** - Based on company dashboard
4. **Update OnboardingFlow** - Add 4-role selection
5. **Create role switching modals**
6. **Add tradesperson search page**
7. **Test role switching flows**
8. **Update routing logic**

## 📝 NOTES

- Keep existing `/dashboard/professional` and `/dashboard/company` for backward compatibility
- Redirect them to new role-specific pages
- Store last used role in localStorage for quick switching
- Add Framer Motion animations for role switching
- Consider email notifications for new homeowner tasks

## 🐛 POTENTIAL ISSUES

1. **Legacy users** - Need migration script to assign them to jobseeker/employer
2. **Multiple profiles** - User shouldn't have both homeowner AND jobseeker profiles (prevent duplicates)
3. **Role switching** - Should preserve all data when switching back
4. **Permissions** - Make sure RLS policies are correct for all 4 roles
5. **Job expiry** - Need cron job or database trigger to auto-expire homeowner tasks after 7 days

---

**Last Updated:** Session context limit reached
**Status:** Database schema complete, frontend implementation in progress
