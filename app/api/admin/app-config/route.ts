export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/server'
import { revalidateTag } from 'next/cache'

/**
 * GET /api/admin/app-config
 *
 * Returns the current admin_settings + feature_flags for the admin panel.
 * Admin-gated via getAdminUser().
 */
export async function GET() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const [settingsRow, flagsRows] = await Promise.all([
      admin.from('admin_settings').select('*').eq('id', 1).maybeSingle(),
      admin.from('feature_flags').select('key, enabled'),
    ])

    const s = settingsRow.data ?? {}
    const flags: Record<string, boolean> = {}
    for (const f of (flagsRows.data ?? []) as any[]) flags[f.key] = f.enabled

    return NextResponse.json({ settings: s, featureFlags: flags })
  } catch (err) {
    console.error('[ADMIN-APP-CONFIG] GET error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/app-config
 *
 * Updates admin_settings and/or feature_flags from the admin panel.
 * Body schema:
 * {
 *   settings?: {
 *     layout_version?: 'v1' | 'v2',
 *     ui_urgent_jobs_banner?: boolean,
 *     ui_promotions_banner?: boolean,
 *     min_app_version?: string,
 *     force_update?: boolean,
 *   },
 *   featureFlags?: {
 *     ai_job_matching?: boolean,
 *     video_quotes?: boolean,
 *     instant_booking?: boolean,
 *   }
 * }
 *
 * After saving, revalidates the 'admin-settings' cache so all users see the
 * change within seconds (no wait for the 10-minute cache to expire).
 */
export async function POST(request: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { settings, featureFlags } = body
    const admin = createAdminClient()
    const errors: string[] = []

    // Update admin_settings via direct upsert (service-role bypasses RLS; avoids
    // auth.uid() issues inside the RPC when called server-side).
    if (settings && Object.keys(settings).length > 0) {
      const { error } = await admin
        .from('admin_settings')
        .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      if (error) errors.push(`settings: ${error.message}`)
    }

    // Update individual feature flag rows
    if (featureFlags && Object.keys(featureFlags).length > 0) {
      for (const [key, enabled] of Object.entries(featureFlags)) {
        const { error } = await admin
          .from('feature_flags')
          .update({ enabled: Boolean(enabled), updated_at: new Date().toISOString() })
          .eq('key', key)
        if (error) errors.push(`flag ${key}: ${error.message}`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
    }

    // Bust the server-side cache immediately so /api/app-config and all pages
    // reflect the new settings on the very next request.
    revalidateTag('admin-settings')

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ADMIN-APP-CONFIG] POST error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
