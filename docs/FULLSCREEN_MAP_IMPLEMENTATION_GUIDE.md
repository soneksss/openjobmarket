# Full-Screen Map Implementation for Jobs & Contractors

## Summary
Add full-screen Google Maps-style view to `/jobs` and `/contractors` pages (same as `/professionals`)

## Pattern from Professionals Page

The professionals page has:
1. **State**: `const [isFullScreenMode, setIsFullScreenMode] = useState(false)`
2. **Toggle Button**: Switches between split view and full-screen
3. **Full-Screen Layout**:
   - Fixed `inset-0` container covering entire viewport
   - Top search bar (sticky)
   - Map on left (flex-1)
   - Scrollable results list on right (w-96 or similar)

## Files to Modify

### 1. `/components/job-map-view.tsx`

**Add State** (around line 98):
```typescript
// Full-screen map mode state
const [isFullScreenMode, setIsFullScreenMode] = useState(false)
```

**Add Toggle Button** in the existing map view section:
```typescript
<Button
  onClick={() => setIsFullScreenMode(true)}
  className="absolute top-4 right-4 z-10 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
>
  <Maximize className="h-4 w-4 mr-2" />
  Full Screen
</Button>
```

**Add Full-Screen Section** (after the main content, before closing div):
```typescript
{/* Full-Screen Map Mode */}
{isFullScreenMode && (
  <div className="fixed inset-0 z-50 bg-white flex flex-col">
    {/* Top Search Bar */}
    <div className="sticky top-0 z-20 bg-white shadow-lg border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Search inputs */}
          {/* Exit button */}
        </div>
      </div>
    </div>

    {/* Map and List Container */}
    <div className="flex-1 flex">
      {/* Map */}
      <div className="flex-1 relative">
        <JobMap ... />
      </div>

      {/* Right Sidebar - Job List */}
      <div className="w-96 bg-white border-l overflow-y-auto">
        {jobs.map(job => (
          <div key={job.id} className="p-4 border-b hover:bg-gray-50">
            {/* Job card content */}
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

### 2. `/components/contractor-map-view.tsx`

Apply the same pattern as jobs:
- Add `isFullScreenMode` state
- Add toggle button
- Add full-screen section with map + list

## Key Features to Include

### Top Search Bar
- Search input
- Location input with LocationPicker
- Advanced filters toggle
- Search button
- Exit full-screen button (X icon)

### Map Section
- Full height (`flex-1`)
- All existing map functionality
- Clickable markers
- Profile popups

### Right Sidebar List
- Width: `w-96` (384px)
- Scrollable: `overflow-y-auto`
- Border left: `border-l`
- Each item:
  - Padding: `p-4`
  - Border bottom: `border-b`
  - Hover effect: `hover:bg-gray-50`
  - Click to view details or navigate

### Exit Behavior
```typescript
<Button
  onClick={() => {
    setIsFullScreenMode(false)
    router.push('/jobs') // or '/contractors'
  }}
  variant="outline"
  className="h-12 px-3 bg-white shadow-lg"
>
  <X className="h-5 w-5" />
</Button>
```

## Icons Needed

Import from lucide-react:
```typescript
import { Maximize, X, Search, Filter, Map } from "lucide-react"
```

## Testing Checklist

- [ ] Toggle to full-screen works
- [ ] Map displays correctly in full-screen
- [ ] Right sidebar list shows all items
- [ ] Scrolling works in sidebar
- [ ] Search filters work in full-screen
- [ ] Exit button works
- [ ] Map markers clickable
- [ ] Profile details show on marker click
- [ ] Responsive on different screen sizes

## Reference
See `components/professionals-page-content.tsx` lines 1348-1900 for complete implementation example.
