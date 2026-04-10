/**
 * Server-side cached query functions.
 *
 * Uses Next.js `unstable_cache` for cross-request data caching keyed by userId.
 * Each function creates a user-specific cache entry and tag so that
 * `revalidateTag(`jobs-user-${userId}`)` only busts that user's cache.
 *
 * Rules:
 * - Auth (`getUser`) is NEVER cached — always live from cookies.
 * - Only read queries are cached here. Mutations call `revalidateTag` to bust.
 * - Uses `createAdminClient` (no cookies needed) inside callbacks so the
 *   cached function can run outside of a request context on cache miss.
 * - Every cached callback wraps its queries in try/catch and returns safe
 *   fallback values so a Supabase timeout never throws into the render.
 */

import { unstable_cache } from 'next/cache'
import { createAdminClient } from './server'

// ─── Homepage ────────────────────────────────────────────────────────────────

/** User type + profile location — cached 5 min, busted on profile update. */
export function getHomepageUserData(userId: string) {
  return unstable_cache(
    async () => {
      try {
        const admin = createAdminClient()
        const [{ data: userData }, { data: cp }, { data: pp }] = await Promise.all([
          admin.from('users').select('user_type').eq('id', userId).single(),
          admin
            .from('company_profiles')
            .select('location, latitude, longitude, industry, services')
            .eq('user_id', userId)
            .maybeSingle(),
          admin
            .from('professional_profiles')
            .select('location, latitude, longitude, skills, title')
            .eq('user_id', userId)
            .maybeSingle(),
        ])
        return { userData, cp, pp }
      } catch (err) {
        console.error('[queries] getHomepageUserData failed:', err)
        return { userData: null, cp: null, pp: null }
      }
    },
    [`homepage-user-${userId}`],
    { revalidate: 300, tags: [`profile-user-${userId}`] }
  )()
}

// ─── Homeowner Dashboard ─────────────────────────────────────────────────────

/** Jobs list — cached 60 s, busted on every job create/update/delete. */
export function getHomeownerJobs(profileId: string, userId: string) {
  return unstable_cache(
    async () => {
      try {
        const admin = createAdminClient()
        const { data } = await admin
          .from('jobs')
          .select(
            'id, title, description, short_description, location, budget_min, budget_max, budget_period, is_active, status, completion_status, expires_at, created_at, updated_at, is_tradespeople_job, work_location, applications_count, views_count'
          )
          .eq('homeowner_id', profileId)
          .order('created_at', { ascending: false })
        return data ?? []
      } catch (err) {
        console.error('[queries] getHomeownerJobs failed:', err)
        return []
      }
    },
    [`homeowner-jobs-${userId}`],
    { revalidate: 60, tags: [`jobs-user-${userId}`] }
  )()
}

/** Reviews received by the homeowner — cached 5 min. */
export function getHomeownerReviews(userId: string) {
  return unstable_cache(
    async () => {
      try {
        const admin = createAdminClient()
        const { data: reviewsRaw } = await admin
          .from('reviews')
          .select('id, rating, comment, review_text, created_at, reviewer_id')
          .eq('reviewed_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)

        const reviewerIds = (reviewsRaw || []).map((r: any) => r.reviewer_id).filter(Boolean)
        const { data: reviewerProfiles } = reviewerIds.length
          ? await admin
              .from('company_profiles')
              .select('user_id, company_name, logo_url')
              .in('user_id', reviewerIds)
          : { data: [] }

        const reviewerMap = Object.fromEntries(
          (reviewerProfiles || []).map((cp: any) => [cp.user_id, cp])
        )
        return (reviewsRaw || []).map((r: any) => {
          const cp = reviewerMap[r.reviewer_id]
          return {
            id: r.id,
            rating: r.rating,
            text: r.comment || r.review_text || '',
            created_at: r.created_at,
            reviewer_name: cp?.company_name ?? 'Tradesperson',
            reviewer_avatar: cp?.logo_url ?? null,
          }
        })
      } catch (err) {
        console.error('[queries] getHomeownerReviews failed:', err)
        return []
      }
    },
    [`homeowner-reviews-${userId}`],
    { revalidate: 300, tags: [`reviews-user-${userId}`] }
  )()
}

/** Saved tradespeople — cached 5 min. */
export function getSavedTradespeople(profileId: string, userId: string) {
  return unstable_cache(
    async () => {
      try {
        const admin = createAdminClient()
        const { data } = await admin
          .from('saved_traders')
          .select(
            'id, professional_id, professional_profiles (id, user_id, first_name, last_name, nickname, title, location, profile_photo_url, skills, average_rating, reviews_count)'
          )
          .eq('homeowner_id', profileId)
          .order('created_at', { ascending: false })
          .limit(5)
        return (data || []).filter((s: any) => s.professional_profiles)
      } catch (err) {
        console.error('[queries] getSavedTradespeople failed:', err)
        return []
      }
    },
    [`saved-traders-${userId}`],
    { revalidate: 300, tags: [`saved-user-${userId}`] }
  )()
}
