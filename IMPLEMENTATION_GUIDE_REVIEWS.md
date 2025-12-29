# Homeowner Ratings & Reviews System - Implementation Guide

## ✅ Completed

### 1. Database Migration (`supabase/migrations/20251229000001_create_reviews_and_ratings_system.sql`)
Created comprehensive migration that includes:
- **Job Status Enum**: `open`, `accepted`, `in_progress`, `completed`, `failed`
- **Reviews Table**: Stores all user reviews with job linkage
- **Rating Fields**: Added to all profile tables (homeowner, company, contractor, professional)
- **Automatic Rating Updates**: Trigger function that recalculates ratings on review insert/update
- **Review Eligibility Function**: `is_review_allowed()` checks if review can be submitted
- **Row Level Security**: Policies for viewing and creating reviews
- **Database View**: `reviews_with_details` for easy querying with user names

**To Apply**: Run this migration through Supabase dashboard or CLI:
```bash
npx supabase db push
```

### 2. React Components Created

#### **`rating-display.tsx`**
- `<RatingDisplay>`: Shows star rating with count
- `<StarRatingInput>`: Interactive star selector for review submission
- Supports 3 sizes: sm, md, lg
- Displays "No reviews yet" for users with 0 reviews

#### **`reviews-list.tsx`**
- Displays all reviews for a user
- Shows reviewer name, photo, rating, comment, date
- Flag review functionality for inappropriate content
- Supports pagination with limit prop
- Fetches from `reviews_with_details` view

### 3. TypeScript Interfaces

```typescript
// Job Status Type
type JobStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'failed'

// Review Interface
interface Review {
  id: string
  job_id: string
  reviewer_id: string
  reviewed_id: string
  rating: number // 1-5
  comment: string
  reviewer_type: 'homeowner' | 'company' | 'contractor' | 'professional'
  reviewed_type: 'homeowner' | 'company' | 'contractor' | 'professional'
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
}
```

## 🚧 To Complete

### 4. Update Existing Review Modal
**File**: `components/review-submission-modal.tsx`

Replace the existing conversation-based review system with job-based reviews:

```typescript
interface ReviewSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string  // CHANGED: was conversationId
  jobTitle: string  // NEW
  reviewedUserId: string  // CHANGED: was revieweeId
  reviewedUserName: string  // CHANGED: was revieweeName
  reviewedUserType: 'homeowner' | 'company' | 'contractor' | 'professional'  // NEW
  reviewerType: 'homeowner' | 'company' | 'contractor' | 'professional'  // NEW
}
```

**Key Changes Needed**:
1. Check review eligibility using `is_review_allowed()` RPC
2. Submit reviews to `reviews` table instead of old table
3. Include `reviewer_type` and `reviewed_type`
4. Show job status requirement message

### 5. Update Job Completion Flow

**File**: `components/job-completion-modal.tsx` (or similar)

When homeowner marks job as complete:
```typescript
const handleCompleteJob = async (success: boolean) => {
  const status = success ? 'completed' : 'failed'
  const { error } = await supabase
    .from('jobs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      failure_reason: success ? null : failureReason
    })
    .eq('id', jobId)

  if (!error && success) {
    // Show review prompt
    setShowReviewModal(true)
  }
}
```

### 6. Update Map Queries

**Files to Update**:
- `components/interactive-job-map.tsx`
- `components/main-page-search.tsx`
- Any other map/search components

**Change**:
```typescript
// BEFORE
.from('jobs')
.select('*')
.eq('is_active', true)

// AFTER
.from('jobs')
.select('*')
.eq('status', 'open')
.eq('is_active', true)
```

### 7. Add Rating Display to Profiles

**Files to Update**:
- `components/homeowner-detail-view.tsx`
- `components/professional-detail-view.tsx`
- `components/company-detail-view.tsx`
- `components/contractor-detail-view.tsx`

**Add**:
```tsx
import { RatingDisplay } from './rating-display'
import { ReviewsList } from './reviews-list'

// In the profile display:
<RatingDisplay
  rating={profile.average_rating || 0}
  reviewsCount={profile.reviews_count || 0}
  size="md"
/>

// Later in the component:
<ReviewsList
  userId={profile.user_id}
  userType={userType}
  limit={5}
  showViewAll={true}
/>
```

### 8. Add Rating to Job Cards

**Files to Update**:
- Job listing components
- Application cards
- Search results

**Add homeowner rating display**:
```tsx
// Fetch homeowner rating when displaying job
const { data: homeownerProfile } = await supabase
  .from('homeowner_profiles')
  .select('average_rating, reviews_count')
  .eq('id', job.homeowner_id)
  .single()

// Display in job card
{homeownerProfile && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600">Posted by:</span>
    <RatingDisplay
      rating={homeownerProfile.average_rating}
      reviewsCount={homeownerProfile.reviews_count}
      size="sm"
    />
  </div>
)}
```

### 9. Job Status Management Component

Create `components/job-status-badge.tsx`:

```tsx
export function JobStatusBadge({ status }: { status: JobStatus }) {
  const config = {
    open: { color: 'bg-green-100 text-green-800', label: 'Open' },
    accepted: { color: 'bg-blue-100 text-blue-800', label: 'Accepted' },
    in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
    completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' }
  }

  const { color, label } = config[status]

  return <Badge className={color}>{label}</Badge>
}
```

### 10. Job Acceptance Flow Update

When homeowner accepts an application:

```typescript
const handleAcceptApplication = async (applicationId: string, contractorId: string) => {
  // 1. Update job status
  await supabase
    .from('jobs')
    .update({
      status: 'accepted',
      accepted_contractor_id: contractorId
    })
    .eq('id', jobId)

  // 2. Update application status
  await supabase
    .from('job_applications')
    .update({ status: 'accepted' })
    .eq('id', applicationId)

  // 3. Reject other applications
  await supabase
    .from('job_applications')
    .update({ status: 'rejected' })
    .eq('job_id', jobId)
    .neq('id', applicationId)
}
```

## 📋 Testing Checklist

### Database
- [ ] Migration applied successfully
- [ ] `reviews` table created
- [ ] Rating fields added to all profile tables
- [ ] Trigger function `update_user_rating()` working
- [ ] RPC function `is_review_allowed()` working
- [ ] Row level security policies active

### Job Lifecycle
- [ ] New jobs created with `status = 'open'`
- [ ] Jobs visible on map only when status = 'open'
- [ ] Accepting application sets status to 'accepted'
- [ ] Job hidden from map when accepted
- [ ] Completing job sets status to 'completed'
- [ ] Failed jobs set status to 'failed'

### Reviews
- [ ] Review modal only shows for completed/failed jobs
- [ ] Cannot submit duplicate reviews
- [ ] Cannot review yourself
- [ ] Rating updates automatically after review submission
- [ ] Reviews display correctly on profiles
- [ ] Can flag inappropriate reviews
- [ ] Review count updates correctly

### UI/UX
- [ ] Star ratings display correctly (half stars work)
- [ ] "No reviews yet" shows for new users
- [ ] Review submission form validates (min 10 chars, rating required)
- [ ] Success/error messages display correctly
- [ ] Page refreshes after review submission
- [ ] Mobile responsive on all components

## 🔐 Security Considerations

1. **RLS Policies**: Ensure users can only:
   - View all reviews (public)
   - Create reviews for jobs they participated in
   - Update only their own reviews
   - Cannot delete reviews (integrity)

2. **Validation**:
   - Rating must be 1-5
   - Comment minimum length enforced
   - Job status checked before allowing review
   - Duplicate review prevention

3. **Admin Moderation**:
   - Flagged reviews require admin review
   - Flag reasons tracked
   - Consider adding admin dashboard for review management

## 📊 Performance Optimization

1. **Indexes Created**:
   - `idx_reviews_job_id`
   - `idx_reviews_reviewer_id`
   - `idx_reviews_reviewed_id`
   - `idx_reviews_created_at`
   - `idx_jobs_status`

2. **View for Performance**:
   - `reviews_with_details` pre-joins user names
   - Reduces frontend query complexity

3. **Caching Considerations**:
   - Cache average ratings (already stored on profile)
   - Only recalculate on new review
   - Consider Redis for high-traffic scenarios

## 🎯 Future Enhancements

1. **Response to Reviews**: Allow reviewed users to respond
2. **Helpful Votes**: Let others mark reviews as helpful
3. **Verified Reviews**: Badge for verified job completion
4. **Photo Uploads**: Attach photos to reviews
5. **Review Templates**: Quick review options for common scenarios
6. **Admin Dashboard**: Manage flagged reviews, disputes
7. **Analytics**: Track review trends, average ratings over time
8. **Email Notifications**: Notify users of new reviews

## 📞 Support

For issues or questions:
1. Check database logs: `SELECT * FROM reviews ORDER BY created_at DESC LIMIT 10`
2. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'reviews'`
3. Test review eligibility: `SELECT * FROM is_review_allowed('job_id', 'reviewer_id', 'reviewed_id')`
