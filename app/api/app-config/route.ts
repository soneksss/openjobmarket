import { NextResponse } from 'next/server'
import { getAdminSettings } from '@/lib/bootstrap'

/**
 * GET /api/app-config
 *
 * Public endpoint — no authentication required.
 * Called by the Capacitor native shell on every app foreground to fetch:
 *   - feature flags (ai_job_matching, video_quotes, instant_booking)
 *   - homepage layout version (v1 / v2)
 *   - UI toggles (urgentJobsBanner, promotionsBanner)
 *   - app version gate (minAppVersion, forceUpdate)
 *
 * Backed by getAdminSettings() which is unstable_cache'd for 10 minutes,
 * so this endpoint costs zero DB queries on a cache hit.
 * HTTP Cache-Control adds a 60-second CDN/browser layer on top.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { adminSettings, featureFlags } = await getAdminSettings()

    const payload = {
      featureFlags: {
        ai_job_matching: featureFlags.aiJobMatching,
        video_quotes:    featureFlags.videoQuotes,
        instant_booking: featureFlags.instantBooking,
      },
      layoutVersion: adminSettings.layoutVersion,
      ui: {
        urgentJobsBanner: adminSettings.ui.urgentJobsBanner,
        promotionsBanner: adminSettings.ui.promotionsBanner,
      },
      minAppVersion: adminSettings.minAppVersion,
      forceUpdate:   adminSettings.forceUpdate,
    }

    const res = NextResponse.json(payload)
    // Allow mobile shells to cache for 60s before re-fetching;
    // stale-while-revalidate keeps the app from blocking on a slow network.
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res
  } catch {
    // Always return safe defaults — the native shell must never crash on this endpoint.
    return NextResponse.json({
      featureFlags:  { ai_job_matching: false, video_quotes: false, instant_booking: false },
      layoutVersion: 'v1',
      ui:            { urgentJobsBanner: true, promotionsBanner: false },
      minAppVersion: '1.0.0',
      forceUpdate:   false,
    })
  }
}
