# Multi-Step Onboarding & Homeowners User Type Implementation

## ✅ What Has Been Implemented

### 1. Multi-Step Onboarding Flow (COMPLETED)

A beautiful, responsive 4-step onboarding process has been created:

#### Components Created:
- **`components/onboarding/OptionButton.tsx`** - Reusable button component with icon, title, subtitle
- **`components/onboarding/ProgressIndicator.tsx`** - Visual progress tracker showing current step
- **`components/onboarding/Step1.tsx`** - Initial action selection (Put Me on Map / Post Jobs)
- **`components/onboarding/Step2.tsx`** - User type selection (Individual / Business)
- **`components/onboarding/Step3.tsx`** - Role selection (conditional based on Step 2)
- **`components/onboarding/SignupStep.tsx`** - Account creation form (email/password)
- **`components/onboarding/OnboardingFlow.tsx`** - Main orchestrator component
- **`components/onboarding/OnboardingModal.tsx`** - Modal wrapper for homepage

#### Features:
✅ Smooth transitions using Framer Motion
✅ Progress indicator showing all 4 steps
✅ localStorage persistence (resume where you left off)
✅ Responsive design (mobile-first)
✅ Password visibility toggle
✅ Form validation
✅ Error handling
✅ Automatic redirect to correct dashboard based on role
✅ Integration with existing Supabase auth

#### User Flow:
1. **Step 1**: Choose action
   - "Put Me on the Map" (for service providers)
   - "Post Jobs" (for hiring)

2. **Step 2**: Choose user type
   - "I am an Individual"
   - "I am a Business"

3. **Step 3**: Choose specific role
   - **If Individual**: Homeowner or Jobseeker/Professional
   - **If Business**: Employer/Company or Trade/Contractor

4. **Step 4**: Create account
   - Email address
   - Password (min 6 characters)
   - Confirm password

#### Redirect Logic:
- **Homeowner** → `/dashboard/homeowner`
- **Jobseeker** → `/dashboard/professional`
- **Employer** → `/dashboard/company`
- **Contractor** → `/dashboard/company`

#### Integration:
- Added to homepage at [app/page.tsx](app/page.tsx) line 66-68
- "Get Started" button above search card triggers onboarding flow
- Can be triggered from any page using `<OnboardingModal />`

---

### 2. Homeowners User Type Database Schema (READY TO RUN)

A complete database schema for the new "homeowner" user type has been created:

#### SQL Migration File:
📄 **[CREATE_HOMEOWNERS_USER_TYPE.sql](CREATE_HOMEOWNERS_USER_TYPE.sql)**

#### What It Creates:

**1. Homeowner Profiles Table** (`homeowner_profiles`)
- Basic info: first_name, last_name, phone, location, coordinates
- Profile: photo_url, bio
- **`on_market` boolean** - Toggle to appear as professional
- Professional fields (shown when `on_market = true`):
  - title, skills, experience_level
  - salary_min, salary_max
  - cv_url, portfolio_url, linkedin_url
  - available_for_work

**2. Homeowner Jobs Table** (`homeowner_jobs`)
- Job details: title, description, category
- Budget: budget_min, budget_max
- Location: location, latitude, longitude
- Urgency: 'urgent', 'normal', or 'flexible'
- Status: 'open', 'in_progress', 'completed', 'cancelled'
- Scheduling: preferred_start_date, estimated_duration
- Contact: preferred_contact method

**3. Security & Performance**
✅ Row Level Security (RLS) policies
✅ Indexes for fast queries
✅ Auto-updating timestamps
✅ Proper foreign key constraints
✅ Granted permissions to authenticated users

#### Categories for Homeowner Jobs:
- Plumbing
- Electrical
- Painting
- Gardening
- Cleaning
- General Repairs
- Carpentry
- Etc.

---

## 🔄 Database Migration Instructions

**IMPORTANT**: Before homeowners can sign up, you must run the SQL migration:

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy contents of `CREATE_HOMEOWNERS_USER_TYPE.sql`
4. Paste and run the SQL

### Option 2: Supabase CLI
```bash
supabase db execute < CREATE_HOMEOWNERS_USER_TYPE.sql
```

### Option 3: Direct psql
```bash
psql -h your-db-host -U postgres -d postgres -f CREATE_HOMEOWNERS_USER_TYPE.sql
```

**Note**: The migration is safe to run multiple times (uses `IF NOT EXISTS` checks).

---

## 📋 What Still Needs to Be Done

### High Priority:
1. **Run the database migration** (see instructions above)
2. **Create Homeowner Dashboard** (`/dashboard/homeowner`)
   - Similar to professional dashboard
   - Show posted jobs
   - Job analytics
   - "Put me on the market" toggle button

3. **Create Homeowner Profile Page**
   - Basic profile fields (always visible)
   - "Put Me on the Market" toggle button
   - When toggled ON:
     - Show professional fields (CV, salary, skills, etc.)
     - Make those fields required
     - Add to professionals map

4. **Create Quick Job Post Form**
   - Simplified job posting (no VAT, company name, etc.)
   - Fields:
     - Title (e.g., "Fix leaking tap")
     - Description
     - Category (dropdown)
     - Budget range
     - Location (with map picker)
     - Urgency level
     - Preferred start date
     - Estimated duration

5. **Update Navigation**
   - Add homeowner routes to navbar
   - Add homeowner dashboard link

### Medium Priority:
6. **Homeowner Job Listings Page**
   - View all jobs you've posted
   - Edit/delete jobs
   - Mark as completed

7. **Homeowner Search Page**
   - Search for tradespeople nearby
   - Filter by trade type
   - Map view with professional pins

8. **Welcome Message for New Homeowners**
   - Show welcome modal on first login
   - Explain features
   - Quick tour

### Testing:
- Test complete signup flow: Individual → Homeowner → Dashboard
- Verify "Put me on market" toggle works
- Test job posting as homeowner
- Test appearing on professionals map when on_market=true

---

## 🎨 UI/UX Notes

**Onboarding Style:**
- Blue/white color palette
- Rounded-xl cards
- Smooth Framer Motion transitions
- Clean, modern design
- Fully responsive
- Mobile-friendly buttons and text

**Homeowner Dashboard Should Include:**
- Quick stats (jobs posted, responses, hired)
- Recent jobs list
- "Post New Job" CTA button
- "Put Me on the Market" toggle (prominent)
- Messages/notifications

**Quick Job Post Form Design:**
- Simple, single-page form (not multi-step)
- Category icons for visual appeal
- Budget slider or number inputs
- Location autocomplete (reuse existing)
- Urgency selector (radio buttons with icons)

---

## 🔗 File Locations

### Onboarding Components:
```
components/onboarding/
├── OnboardingFlow.tsx       # Main orchestrator
├── OnboardingModal.tsx      # Modal wrapper
├── OptionButton.tsx         # Reusable button
├── ProgressIndicator.tsx    # Progress tracker
├── Step1.tsx               # Action selection
├── Step2.tsx               # User type selection
├── Step3.tsx               # Role selection
└── SignupStep.tsx          # Account creation
```

### Database:
```
CREATE_HOMEOWNERS_USER_TYPE.sql   # Migration to run
```

### Homepage Integration:
```
app/page.tsx                      # Line 66-68 (onboarding button)
```

---

## 🚀 Next Steps Summary

1. ✅ Multi-step onboarding flow - **COMPLETE**
2. ✅ Homeowner database schema - **COMPLETE** (needs migration)
3. ⏳ Run database migration - **REQUIRED BEFORE TESTING**
4. ⏳ Create homeowner dashboard
5. ⏳ Create homeowner profile with toggle
6. ⏳ Create quick job post form
7. ⏳ Test complete homeowner flow

---

## 💡 Key Design Decisions

**Why Homeowners are Separate from Professionals:**
- Different use case (hiring vs being hired)
- Simpler requirements initially
- Can "level up" to professional via toggle
- Easier onboarding for non-technical users

**Why "Put Me on the Market" Toggle:**
- Homeowners may want to hire AND offer services
- Flexible - toggle on/off anytime
- Reuses professional infrastructure
- Single account, dual purpose

**Why Simplified Job Posting:**
- Homeowners aren't businesses
- No VAT, company name, etc. needed
- Focus on the task itself
- Faster, easier posting

---

## ✨ User Experience Flow Example

**Sarah (Homeowner) Signs Up:**
1. Clicks "Get Started" on homepage
2. Selects "Post Jobs"
3. Selects "I am an Individual"
4. Selects "Homeowner"
5. Creates account with email/password
6. Redirected to `/dashboard/homeowner`
7. Sees welcome message
8. Clicks "Post My First Job"
9. Fills out quick form: "Fix leaking tap under kitchen sink"
10. Job appears on map for nearby tradespeople

**Later, Sarah Wants to Offer Services:**
1. Goes to profile
2. Toggles "Put Me on the Market" to ON
3. Professional fields appear (CV, skills, salary)
4. Fills out professional info
5. Now appears on professionals map
6. Can receive job offers from companies
