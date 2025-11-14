# Reviews & Star Rating System - Setup Guide

This document provides step-by-step instructions to activate the complete Reviews & Star Rating system in your OpenJobMarket application.

## Overview

The Reviews & Star Rating system has been fully implemented with the following features:

- **Eligibility**: Users can only review after verified interactions (contact + reply)
- **Star Ratings**: 1-5 stars with optional text review
- **Profanity Filter**: Blocks inappropriate language automatically
- **Profile Display**: Shows reviews with average rating and statistics
- **Edit/Delete**: Users can modify reviews within 24 hours
- **Security**: Row-level security policies and validation
- **Auto-Verification**: Automatic interaction tracking on message replies
- **Manual Verification**: API for verifying job applications and other interactions

---

## Step 1: Run Database Migration

### **IMPORTANT: This is the critical first step**

1. Open your Supabase Dashboard at [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of the file: `supabase/migrations/CREATE_REVIEWS_SYSTEM.sql`
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### What this migration creates:

- `reviews` table - Stores all reviews with ratings and text
- `review_interactions` table - Tracks verified interactions between users
- `user_review_stats` view - Aggregated statistics (average rating, counts)
- `can_user_review()` function - Checks if user is eligible to review
- `verify_interaction_on_reply()` trigger - Auto-creates interactions when users reply to messages
- Row Level Security (RLS) policies for data protection
- Indexes for optimal query performance

### Verify the migration:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('reviews', 'review_interactions');

-- Check if view exists
SELECT table_name FROM information_schema.views
WHERE table_name = 'user_review_stats';

-- Check if function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('can_user_review', 'verify_interaction_on_reply');
```

---

## Step 2: Verify Integration Points

All integration points have been automatically implemented:

### ✅ Professional Profiles
- Location: [components/professional-detail-view.tsx](components/professional-detail-view.tsx#L33)
- The `UserReviewsDisplay` component is now showing on professional profile pages
- Displays average rating, star distribution, and all reviews

### ✅ Message Conversations
- Location: [components/conversation-view.tsx](components/conversation-view.tsx#L13)
- "Leave a Review" button appears when:
  - Users have exchanged messages (verified interaction exists)
  - The conversation has at least one message
- Opens `ReviewSubmissionModal` for easy review submission

### ✅ Job Applications
- Location: [app/jobs/[id]/applications/page.tsx](app/jobs/[id]/applications/page.tsx#L9)
- Component: [components/application-actions.tsx](components/application-actions.tsx)
- When an employer accepts an application:
  - Application status is updated
  - Interaction is automatically verified via API
  - Both users can now leave reviews for each other

---

## Step 3: Test the Complete Flow

### Test 1: Message-Based Interaction Verification

1. **As Employer (Company User)**:
   - Go to a professional's profile: `/professionals/{professional-id}`
   - Click "Send Inquiry" button
   - Send a message to the professional

2. **As Professional**:
   - Log in as the professional user
   - Go to Messages page: `/messages`
   - Open the conversation from the employer
   - Reply to the message

3. **Verify Interaction Created**:
   - After the professional replies, the interaction is automatically recorded
   - Check in Supabase:
     ```sql
     SELECT * FROM review_interactions
     WHERE interaction_type = 'message_reply'
     ORDER BY verified_at DESC LIMIT 5;
     ```

4. **Test Review Submission**:
   - As the employer, open the conversation
   - You should see a "Leave a Review" button in the header
   - Click it and submit a 5-star review with text
   - Verify it appears on the professional's profile

### Test 2: Job Application-Based Verification

1. **As Professional**:
   - Browse jobs: `/jobs`
   - Apply to a job posting
   - Fill out the application form

2. **As Employer**:
   - Go to your jobs dashboard: `/dashboard/company/jobs`
   - Click on the job that received the application
   - Click "Applications" button
   - You should see the application with action buttons

3. **Accept the Application**:
   - Click the green "Accept" button
   - This triggers:
     - Application status → "accepted"
     - API call to `/api/reviews/verify-interaction`
     - Interaction is recorded in database

4. **Verify Both Can Review**:
   - Check in Supabase:
     ```sql
     SELECT * FROM review_interactions
     WHERE interaction_type = 'job_application_accepted'
     ORDER BY verified_at DESC LIMIT 5;
     ```
   - Both the employer and professional can now review each other

### Test 3: Profanity Filter

1. Try to submit a review with profanity (e.g., "This guy is a damn idiot")
2. You should see an error: "Your review contains inappropriate language"
3. The review should NOT be saved to the database

### Test 4: Edit/Delete Within 24 Hours

1. Submit a review
2. Immediately try to edit it:
   - API: `PUT /api/reviews/{review-id}`
   - Body: `{ "rating": 4, "reviewText": "Updated text" }`
3. Verify the review is updated and `is_edited` is set to `true`
4. Try to delete it:
   - API: `DELETE /api/reviews/{review-id}`
5. Verify the review is removed

### Test 5: Cannot Review After 24 Hours

1. In Supabase, manually update a review's `created_at` to 25 hours ago:
   ```sql
   UPDATE reviews
   SET created_at = NOW() - INTERVAL '25 hours'
   WHERE id = 'your-review-id';
   ```
2. Try to edit or delete the review via API
3. You should receive a 403 error: "Reviews can only be edited/deleted within 24 hours"

### Test 6: Cannot Review Without Interaction

1. As a user, try to access the profile of someone you haven't interacted with
2. The "Leave a Review" button should NOT appear
3. If you try to submit via API directly, you should get error 403:
   - "You can only review users you've had verified interactions with"

---

## Step 4: Add Reviews to Company Profiles (Optional)

Currently, reviews are displayed on **professional profiles** only. If you want to add reviews to **company profiles** as well:

1. Find your company profile view component (likely `components/company-detail-view.tsx` or similar)
2. Add the import:
   ```tsx
   import UserReviewsDisplay from "./user-reviews-display"
   ```
3. Add the component in the appropriate section:
   ```tsx
   {/* Reviews Section */}
   <UserReviewsDisplay userId={company.user_id} showStats={true} />
   ```

---

## Step 5: Customize Review Display (Optional)

You can customize how reviews appear by modifying [components/user-reviews-display.tsx](components/user-reviews-display.tsx):

### Change Colors:
```tsx
// Current: Yellow stars
<Star className="fill-yellow-400 text-yellow-400" />

// Change to: Blue stars
<Star className="fill-blue-400 text-blue-400" />
```

### Change Review Limit:
```tsx
// Current: Shows first 5 reviews initially
const displayedReviews = showAll ? reviews : reviews.slice(0, 5)

// Change to: Shows first 10 reviews
const displayedReviews = showAll ? reviews : reviews.slice(0, 10)
```

### Add Verified Badge:
In the review card, add:
```tsx
{review.interaction_verified && (
  <Badge variant="outline" className="text-green-600">
    <CheckCircle className="h-3 w-3 mr-1" />
    Verified Interaction
  </Badge>
)}
```

---

## API Endpoints Reference

### Submit a Review
```
POST /api/reviews
Body: {
  "revieweeId": "uuid-of-user-being-reviewed",
  "rating": 5,
  "reviewText": "Great experience!",
  "conversationId": "optional-uuid-of-conversation"
}
Response: 201 Created
```

### Get Reviews for a User
```
GET /api/reviews?userId={user-id}
Response: { reviews: [...], total: 10 }
```

### Get Review Statistics
```
GET /api/reviews/stats?userId={user-id}
Response: {
  stats: {
    total_reviews: 10,
    average_rating: 4.5,
    five_star_count: 6,
    four_star_count: 3,
    three_star_count: 1,
    two_star_count: 0,
    one_star_count: 0
  }
}
```

### Update a Review (within 24 hours)
```
PUT /api/reviews/{review-id}
Body: {
  "rating": 4,
  "reviewText": "Updated review text"
}
Response: 200 OK
```

### Delete a Review (within 24 hours)
```
DELETE /api/reviews/{review-id}
Response: 200 OK
```

### Manually Verify Interaction
```
POST /api/reviews/verify-interaction
Body: {
  "userBId": "uuid-of-other-user",
  "interactionType": "job_application_accepted",
  "conversationId": "optional-conversation-uuid"
}
Response: 201 Created
```

### Check if User Can Review
```
GET /api/reviews/verify-interaction?userId={user-id}
Response: {
  canReview: true,
  hasInteraction: true
}
```

---

## Database Schema Reference

### reviews Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| reviewer_id | UUID | User who wrote the review |
| reviewee_id | UUID | User being reviewed |
| rating | INTEGER | 1-5 star rating |
| review_text | TEXT | Optional review text |
| interaction_verified | BOOLEAN | Whether interaction was verified |
| conversation_id | UUID | Optional conversation reference |
| created_at | TIMESTAMP | When review was created |
| updated_at | TIMESTAMP | Last update timestamp |
| is_edited | BOOLEAN | Whether review was edited |
| is_flagged | BOOLEAN | Whether review was flagged |

### review_interactions Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_a_id | UUID | First user (lower UUID) |
| user_b_id | UUID | Second user (higher UUID) |
| conversation_id | UUID | Optional conversation reference |
| interaction_type | TEXT | Type of interaction |
| verified_at | TIMESTAMP | When interaction was verified |

### user_review_stats View
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | User being reviewed |
| total_reviews | INTEGER | Total number of reviews |
| average_rating | NUMERIC(3,2) | Average rating (e.g., 4.53) |
| five_star_count | INTEGER | Number of 5-star reviews |
| four_star_count | INTEGER | Number of 4-star reviews |
| three_star_count | INTEGER | Number of 3-star reviews |
| two_star_count | INTEGER | Number of 2-star reviews |
| one_star_count | INTEGER | Number of 1-star reviews |

---

## Troubleshooting

### Reviews don't appear on profile
1. Verify database migration ran successfully
2. Check that `UserReviewsDisplay` component is imported and used
3. Check browser console for errors
4. Verify user has reviews: `SELECT * FROM reviews WHERE reviewee_id = 'user-id'`

### "Leave a Review" button doesn't appear
1. Check that users have exchanged messages: `SELECT * FROM review_interactions`
2. Verify the conversation has messages: `SELECT * FROM messages WHERE conversation_id = 'id'`
3. Check browser console for API errors

### Profanity filter not working
1. Verify `lib/profanity-filter.ts` exists and is imported in API routes
2. Test the filter directly:
   ```typescript
   import { containsProfanity } from '@/lib/profanity-filter'
   console.log(containsProfanity("This is damn bad")) // Should return true
   ```

### Application acceptance doesn't verify interaction
1. Check `components/application-actions.tsx` has the verify API call
2. Check browser network tab for failed API requests
3. Verify API route `/api/reviews/verify-interaction` is accessible
4. Check server logs for errors

### Can't edit/delete review
1. Check that review is less than 24 hours old
2. Verify user is the original reviewer (not the reviewee)
3. Check RLS policies in Supabase

---

## Security Considerations

### ✅ Implemented Security Features:

1. **Row Level Security (RLS)**:
   - Reviews are publicly readable (for profile display)
   - Only authenticated users can create reviews
   - Users can only update/delete their own reviews
   - 24-hour window enforced at database level

2. **Interaction Verification**:
   - Users cannot review without a verified interaction
   - Database constraint prevents duplicate reviews per conversation
   - Users cannot review themselves (database constraint)

3. **Profanity Filtering**:
   - Comprehensive word list with variations
   - Regex-based pattern matching
   - Sanitization removes HTML and control characters

4. **API Validation**:
   - Rating must be 1-5 integer
   - Review text limited to 2000 characters
   - All inputs sanitized before storage

### 🔒 Additional Security Recommendations:

1. **Rate Limiting**: Add rate limiting to review submission API
2. **Spam Detection**: Implement duplicate content detection
3. **Moderation Queue**: Add admin review for flagged content
4. **Report Feature**: Allow users to report inappropriate reviews
5. **Verification Badges**: Show "Verified Purchase" or "Verified Hire" badges

---

## Next Steps

1. ✅ Run database migration (Step 1)
2. ✅ Test message-based review flow (Step 3, Test 1)
3. ✅ Test job application review flow (Step 3, Test 2)
4. ✅ Test profanity filter (Step 3, Test 3)
5. ✅ Test edit/delete functionality (Step 3, Tests 4-5)
6. ⬜ Add reviews to company profiles (Step 4 - optional)
7. ⬜ Customize review display (Step 5 - optional)
8. ⬜ Implement additional security features (as needed)

---

## Support

If you encounter any issues:

1. Check the browser console for JavaScript errors
2. Check the server logs for API errors
3. Verify database migration completed successfully
4. Review the troubleshooting section above
5. Check Supabase logs for database errors

All code is thoroughly commented and follows best practices for maintainability and security.

---

**System Status**: ✅ Fully Implemented and Ready for Testing

The Reviews & Star Rating system is now complete and integrated into your OpenJobMarket application. After running the database migration, you can immediately start testing the review functionality across all user types.
