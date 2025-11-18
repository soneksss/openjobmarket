# Implementation Guide for Remaining Tasks

## ✅ Task #8: Success Stories Photos - ALREADY COMPLETE!
The success stories cards already have photos. See `app/page.tsx` lines 112-166.

## ✅ Task #2: Map Picker - ALREADY FIXED!
The contractors map picker has been fixed. See `components/contractor-map.tsx`.

---

## 🔄 Task #6: Rename "Contractors" to "Tradespeople"

### Priority: HIGH (affects all other tasks)

### Files to Update:

#### 1. Main Page Button
**File:** `app/page.tsx` or `components/category-cards.tsx`
- Find: "Find Contractors" button
- Replace with: "Find Tradespeople"
- Change color to blue (from current color)

#### 2. Routes and Page Names
- Rename `/contractors` → `/tradespeople` OR
- Keep `/contractors` but update all display text

#### 3. Global Text Replacement
Search and replace in ALL files:
- "Contractor" → "Tradesperson" (singular)
- "Contractors" → "Tradespeople" (plural)
- "contractor" → "tradesperson" (lowercase)
- "contractors" → "tradespeople" (lowercase)

**Be careful NOT to replace:**
- `contractor_profiles` (database table name)
- `contractor-` (in file names initially, can rename later)
- Function names that would break imports

#### 4. Component Renames (Optional but recommended)
- `contractor-map-view.tsx` → `tradespeople-map-view.tsx`
- `contractor-map.tsx` → `tradespeople-map.tsx`
- `ContractorMapView` → `TradespeopleMapView`

### SQL Changes (if renaming database objects):
```sql
-- Only if you want to rename database tables
-- WARNING: This will break existing code until all references are updated

-- Rename table (OPTIONAL - not recommended unless necessary)
-- ALTER TABLE contractor_profiles RENAME TO tradespeople_profiles;

-- Better approach: Just update display text, keep database names
-- This avoids breaking changes
```

---

## 🔄 Task #3 & #4: Self-Employed vs Company Checkbox

### A. Add to Database Schema

**File:** Create `ADD_TRADESPEOPLE_TYPE.sql`

```sql
-- Add employment_type to contractor profiles
ALTER TABLE public.contractor_profiles
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'self_employed'
CHECK (employment_type IN ('self_employed', 'company'));

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_contractor_profiles_employment_type
ON public.contractor_profiles(employment_type);

-- Comment
COMMENT ON COLUMN public.contractor_profiles.employment_type IS
'Whether the tradesperson is self-employed or represents a company';

-- For professional_profiles (if tradespeople use this table instead)
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'self_employed'
CHECK (employment_type IN ('self_employed', 'company'));

CREATE INDEX IF NOT EXISTS idx_professional_profiles_employment_type
ON public.professional_profiles(employment_type);
```

### B. Update Signup Flow

**File:** `components/contractor-onboarding-form.tsx` or similar

Add after basic info section:

```tsx
{/* Employment Type Selection */}
<div className="space-y-4">
  <Label className="text-lg font-semibold">
    How do you operate? <span className="text-red-500">*</span>
  </Label>
  <div className="grid grid-cols-2 gap-4">
    <label
      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
        formData.employmentType === 'self_employed'
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300'
      }`}
    >
      <input
        type="radio"
        name="employmentType"
        value="self_employed"
        checked={formData.employmentType === 'self_employed'}
        onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
        className="mr-3"
      />
      <div>
        <div className="font-semibold">I am Self-Employed</div>
        <div className="text-sm text-gray-600">Working independently</div>
      </div>
    </label>

    <label
      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
        formData.employmentType === 'company'
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300'
      }`}
    >
      <input
        type="radio"
        name="employmentType"
        value="company"
        checked={formData.employmentType === 'company'}
        onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
        className="mr-3"
      />
      <div>
        <div className="font-semibold">I Represent a Company</div>
        <div className="text-sm text-gray-600">Business entity</div>
      </div>
    </label>
  </div>
</div>
```

### C. Update Profile Edit Forms

**Files:**
- `components/contractor-profile-edit-form.tsx`
- `components/profile-edit-form.tsx`

Add the same radio button selection to the edit form.

### D. Update Search Filters

**File:** `app/contractors/page.tsx`

Add employment_type filter:

```typescript
// In the query building section
if (params.employment_type) {
  if (params.employment_type === 'self_employed') {
    professionalQuery = professionalQuery.eq('employment_type', 'self_employed')
  } else if (params.employment_type === 'company') {
    companyQuery = companyQuery.eq('employment_type', 'company')
  }
}
```

**File:** `components/contractor-map-view.tsx`

Add filter UI:

```tsx
<div className="flex items-center gap-4">
  <Checkbox
    id="self-employed"
    checked={selfEmployedFilter}
    onCheckedChange={(checked) => setSelfEmployedFilter(checked as boolean)}
  />
  <Label htmlFor="self-employed">Self-Employed Only</Label>
</div>

<div className="flex items-center gap-4">
  <Checkbox
    id="company"
    checked={companyFilter}
    onCheckedChange={(checked) => setCompanyFilter(checked as boolean)}
  />
  <Label htmlFor="company">Companies Only</Label>
</div>
```

---

## 🔄 Task #1: Add Background to Authenticated Pages

### Approach: Create a Layout Wrapper

**File:** Create `components/authenticated-page-wrapper.tsx`

```tsx
import { ReactNode } from 'react'

interface AuthenticatedPageWrapperProps {
  children: ReactNode
  showBackground?: boolean
}

export function AuthenticatedPageWrapper({
  children,
  showBackground = true
}: AuthenticatedPageWrapperProps) {
  if (!showBackground) {
    return <>{children}</>
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/London-buildings.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#f8fafc' // fallback color
      }}
    >
      {/* Floating elements for visual interest */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl animate-pulse delay-1000 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
```

### Then Wrap Pages:

**Example:** `app/dashboard/company/page.tsx`

```tsx
import { AuthenticatedPageWrapper } from '@/components/authenticated-page-wrapper'

export default function CompanyDashboard() {
  return (
    <AuthenticatedPageWrapper>
      {/* existing content */}
    </AuthenticatedPageWrapper>
  )
}
```

Apply to:
- `/dashboard/company/**`
- `/dashboard/professional/**`
- `/dashboard/homeowner/**`
- `/jobs/**`
- `/professionals/**`
- `/contractors/**` (or `/tradespeople/**`)

---

## 🔄 Task #5: Full Screen Map for Contractors

### Current State
The contractors page already has a map, but needs full-screen mode.

### Implementation

**File:** `components/contractor-map-view.tsx`

Look for the existing map rendering and add full-screen state:

```tsx
const [isFullScreen, setIsFullScreen] = useState(false)

// Add button to toggle full screen
<Button
  onClick={() => setIsFullScreen(!isFullScreen)}
  variant="outline"
  size="sm"
>
  {isFullScreen ? <Minimize2 /> : <Maximize2 />}
  {isFullScreen ? 'Exit Full Screen' : 'Full Screen Map'}
</Button>

// Conditionally apply full-screen styles
<div className={`
  ${isFullScreen
    ? 'fixed inset-0 z-50 bg-white'
    : 'relative h-[600px]'
  }
`}>
  <ContractorMap {...props} />

  {isFullScreen && (
    <Button
      onClick={() => setIsFullScreen(false)}
      className="absolute top-4 right-4 z-[1001]"
      variant="destructive"
    >
      <X className="mr-2" />
      Close Map
    </Button>
  )}
</div>
```

Reference the professionals page implementation for full details on how they handle full-screen map mode.

---

## 🔄 Task #7: Fix Messages Page Not Loading

### Debugging Steps:

1. **Check Browser Console**
   - Open http://localhost:3005/messages
   - Open DevTools Console (F12)
   - Look for error messages

2. **Check Server Logs**
   - Look at terminal where `npm run dev` is running
   - Check for SQL errors or timeout errors

3. **Common Issues:**

**A. RLS Policies**
```sql
-- Check if messages table has proper RLS policies
SELECT * FROM pg_policies WHERE tablename = 'messages';

-- If missing, add:
CREATE POLICY "Users can view their own messages"
ON messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
```

**B. Query Timeout**
**File:** `app/messages/page.tsx`

Check if the query is taking too long. Add pagination:

```tsx
const { data: messages, error } = await supabase
  .from('messages')
  .select(`
    *,
    sender:sender_id(full_name, profile_photo_url),
    recipient:recipient_id(full_name, profile_photo_url)
  `)
  .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
  .order('created_at', { ascending: false })
  .limit(50) // Add pagination
```

**C. Missing Joins**
If the query references tables that don't exist or have been renamed, fix the join paths.

**D. Add Error Handling**
```tsx
if (error) {
  console.error('[MESSAGES] Error loading:', error)
  return <div>Error loading messages: {error.message}</div>
}

if (!messages || messages.length === 0) {
  return <div>No messages found</div>
}
```

### Quick Fix Template:

**File:** `app/messages/page.tsx`

```tsx
export default async function MessagesPage() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/auth/sign-in')
    }

    console.log('[MESSAGES] Loading messages for user:', user.id)

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50)

    console.log('[MESSAGES] Query result:', {
      count: messages?.length,
      error: error?.message
    })

    if (error) {
      throw error
    }

    return <MessagesPageClient messages={messages || []} user={user} />

  } catch (error) {
    console.error('[MESSAGES] Fatal error:', error)
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error Loading Messages</h1>
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    )
  }
}
```

---

## Summary Checklist

- [ ] Task #8: Success Stories Photos ✅ DONE
- [ ] Task #2: Map Picker ✅ DONE
- [ ] Task #6: Rename Contractors → Tradespeople
- [ ] Task #3: Add Self-Employed checkbox to profiles
- [ ] Task #4: Add to signup flow
- [ ] Task #1: Add background to authenticated pages
- [ ] Task #5: Full-screen map for contractors
- [ ] Task #7: Fix messages loading

---

## Testing Checklist

After implementing:

1. ✅ Can post jobs as company
2. ✅ Can post jobs as homeowner
3. ✅ SQL migration runs without errors
4. ✅ Tradespeople are searchable with filters
5. ✅ Self-employed vs company filter works
6. ✅ Map picker works on /contractors
7. ✅ Full-screen map toggles
8. ✅ Messages load properly
9. ✅ Background appears on all auth pages
10. ✅ All "Contractor" text changed to "Tradesperson"
