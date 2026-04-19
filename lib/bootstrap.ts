/**
 * Page-level bootstrap functions.
 *
 * Each page calls exactly one bootstrap function that returns everything
 * needed for the initial render.  Components must not call getUser(),
 * fetchAdminSettings(), or any auth check on mount — all of that lives here.
 *
 * Caching layers:
 * - React cache()         — per-request deduplication. If two server components
 *                           in the same render tree call the same bootstrap with
 *                           the same args, only one execution happens.
 * - unstable_cache        — cross-request caching. Admin settings are shared
 *                           across all concurrent users; profile data is keyed
 *                           per userId.  Busted via revalidateTag().
 *
 * Auth (getUser) is NEVER cached — always live from cookies.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from './server'
import { getHomepageUserData } from './queries'

// ─── Shared types ─────────────────────────────────────────────────────────────

export type AdminSettings = {
  vacanciesJobseekersEnabled: boolean
  layoutVersion: 'v1' | 'v2'
  ui: {
    urgentJobsBanner: boolean
    promotionsBanner: boolean
  }
  minAppVersion: string
  forceUpdate: boolean
}

export type FeatureFlags = {
  aiJobMatching:  boolean
  videoQuotes:    boolean
  instantBooking: boolean
}

export type Permissions = null   // e.g. { canPostJobs: boolean; isAdmin: boolean }

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  vacanciesJobseekersEnabled: true,
  layoutVersion: 'v1',
  ui: { urgentJobsBanner: true, promotionsBanner: false },
  minAppVersion: '1.0.0',
  forceUpdate: false,
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  aiJobMatching:  false,
  videoQuotes:    false,
  instantBooking: false,
}

// ─── Global public settings ───────────────────────────────────────────────────

/**
 * Fetches admin-controlled settings + feature flags from Supabase.
 * Two RPCs are called in parallel: get_public_admin_settings() and
 * get_public_feature_flags().
 *
 * Cached 10 minutes across all users — safe because it's not user-specific.
 * Call `revalidateTag('admin-settings')` from any mutation route that changes
 * these settings.
 */
export const getAdminSettings = unstable_cache(
  async (): Promise<{ adminSettings: AdminSettings; featureFlags: FeatureFlags }> => {
    try {
      const admin = createAdminClient()

      const [settingsRes, flagsRes] = await Promise.all([
        admin.rpc('get_public_admin_settings'),
        admin.rpc('get_public_feature_flags'),
      ])

      if (settingsRes.error || !settingsRes.data) {
        return { adminSettings: DEFAULT_ADMIN_SETTINGS, featureFlags: DEFAULT_FEATURE_FLAGS }
      }

      const d = settingsRes.data
      const f = flagsRes.data ?? {}

      return {
        adminSettings: {
          vacanciesJobseekersEnabled: d.vacancies_jobseekers_enabled ?? true,
          layoutVersion:              (d.layout_version === 'v2' ? 'v2' : 'v1'),
          ui: {
            urgentJobsBanner: d.ui_urgent_jobs_banner ?? true,
            promotionsBanner: d.ui_promotions_banner  ?? false,
          },
          minAppVersion: d.min_app_version ?? '1.0.0',
          forceUpdate:   d.force_update    ?? false,
        },
        featureFlags: {
          aiJobMatching:  f.ai_job_matching  ?? false,
          videoQuotes:    f.video_quotes     ?? false,
          instantBooking: f.instant_booking  ?? false,
        },
      }
    } catch {
      return { adminSettings: DEFAULT_ADMIN_SETTINGS, featureFlags: DEFAULT_FEATURE_FLAGS }
    }
  },
  ['admin-settings'],
  { revalidate: 600, tags: ['admin-settings'] }
)

// ─── Homepage bootstrap ────────────────────────────────────────────────────────

export interface HomePageBootstrap {
  adminSettings: AdminSettings
  featureFlags: FeatureFlags
  permissions: Permissions
  userType: string | null
  profileLocation: { location: string; latitude: number; longitude: number } | null
  profileSkills: string[]
  profileIndustry: string | null
  profileServices: string[]
}

const EMPTY_HOME_BOOTSTRAP: Omit<HomePageBootstrap, 'adminSettings' | 'featureFlags'> = {
  permissions: null,
  userType: null,
  profileLocation: null,
  profileSkills: [],
  profileIndustry: null,
  profileServices: [],
}

/**
 * Single entry point for all homepage data.
 * Wrapped with React cache() so duplicate calls within the same render tree
 * (e.g. layout + page both importing this) execute only once per request.
 * Auth (`user`) is resolved by the calling page — never cached here.
 * Profile data comes from `getHomepageUserData` (cached 5 min per user).
 */
export const getHomePageBootstrap = cache(async (user: any): Promise<HomePageBootstrap> => {
  const { adminSettings, featureFlags } = await getAdminSettings()

  if (!user) {
    return { adminSettings, featureFlags, ...EMPTY_HOME_BOOTSTRAP }
  }

  try {
    const { userData, cp, pp } = await getHomepageUserData(user.id)
    const userType = userData?.user_type ?? null

    let profileLocation: HomePageBootstrap['profileLocation'] = null
    let profileSkills: string[] = []
    let profileIndustry: string | null = null
    let profileServices: string[] = []

    if (cp?.latitude && cp?.longitude) {
      profileLocation = { location: cp.location ?? '', latitude: cp.latitude, longitude: cp.longitude }
    } else if (pp?.latitude && pp?.longitude) {
      profileLocation = { location: pp.location ?? '', latitude: pp.latitude, longitude: pp.longitude }
    }

    if (cp) {
      profileIndustry = cp.industry ?? null
      profileServices = Array.isArray(cp.services) ? cp.services.filter(Boolean) : []
      const skills: string[] = []
      if (cp.industry) skills.push(cp.industry)
      if (Array.isArray(cp.services)) skills.push(...cp.services)
      profileSkills = skills.filter(Boolean)
    } else if (pp) {
      const skills: string[] = []
      if (pp.title) skills.push(pp.title)
      if (Array.isArray(pp.skills)) skills.push(...pp.skills)
      profileSkills = skills.filter(Boolean)
    }

    return {
      adminSettings,
      featureFlags,
      permissions: null,
      userType,
      profileLocation,
      profileSkills,
      profileIndustry,
      profileServices,
    }
  } catch {
    // Network/timeout — degrade gracefully, admin settings still available
    return { adminSettings, featureFlags, ...EMPTY_HOME_BOOTSTRAP }
  }
})

// ─── Dashboard bootstrap ───────────────────────────────────────────────────────

export interface DashboardBootstrap {
  adminSettings: AdminSettings
  featureFlags: FeatureFlags
  permissions: Permissions
}

/**
 * Entry point for all dashboard pages.
 * Wrapped with React cache() for per-request deduplication.
 * Extend the return value here — never in individual page files.
 */
export const getDashboardBootstrap = cache(async (userId: string): Promise<DashboardBootstrap> => {
  const { adminSettings, featureFlags } = await getAdminSettings()
  return { adminSettings, featureFlags, permissions: null }
})
