export const dynamic = 'force-dynamic'

/**
 * POST /api/jobs/[id]/dispatch-flexible
 *
 * Called immediately after a flexible job (urgency_type = 'flexible') is created.
 * Finds all AVAILABLE tradespeople in the local radius who match the job's
 * trade/industry and have flexible_job_notifications = true, then sends them
 * both a web push notification and an in-app notification.
 *
 * Dedup: uses job_notifications_sent (same table as urgent dispatch) so a
 * tradesperson is never notified twice for the same job regardless of which
 * dispatch path ran first.
 *
 * Does NOT touch urgent_job_dispatch_alerts — that table is for urgent tracking only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server'
import { sendWebPushToUser } from '@/lib/web-push'
import { sendNativePush } from '@/lib/native-push'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  if (!jobId) return NextResponse.json({ error: 'Missing job ID' }, { status: 400 })

  try {
    const admin = createAdminClient()

    // ── 1. Fetch job ────────────────────────────────────────────────────────
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, title, location, latitude, longitude, industry, service, urgency_type, status, matching_status, is_active, expires_at, company_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) {
      console.error('[DISPATCH-FLEXIBLE] Job not found:', jobId)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // ── 2. Guards ───────────────────────────────────────────────────────────
    if (job.urgency_type !== 'flexible') {
      return NextResponse.json({ error: 'Not a flexible job' }, { status: 400 })
    }

    // Skip if job is no longer active (race: homeowner cancelled before dispatch ran)
    if (!job.is_active || job.status === 'COMPLETED' || job.status === 'CANCELLED' ||
        (job.expires_at && new Date(job.expires_at) <= new Date())) {
      console.log(`[DISPATCH-FLEXIBLE] Job ${jobId} inactive/expired — skipping`)
      return NextResponse.json({ success: true, dispatched: 0, reason: 'job_inactive' })
    }

    if (job.status && !['POSTED', 'posted', 'open'].includes(job.status)) {
      return NextResponse.json({ success: true, dispatched: 0, reason: 'already_confirmed' })
    }

    const lat = job.latitude as number | null
    const lon = job.longitude as number | null
    if (!lat || !lon) {
      return NextResponse.json({ error: 'Job has no coordinates' }, { status: 400 })
    }

    // ── 3. Find matching tradespeople ───────────────────────────────────────
    const { data: companies, error: matchErr } = await admin.rpc(
      'find_companies_for_flexible_dispatch',
      {
        p_job_id:   jobId,
        p_job_lat:  lat,
        p_job_lon:  lon,
        p_industry: (job.industry as string | null) ?? null,
        p_service:  (job.service  as string | null) ?? null,
      }
    )

    if (matchErr) {
      console.error('[DISPATCH-FLEXIBLE] RPC error:', matchErr)
      return NextResponse.json({ error: matchErr.message }, { status: 500 })
    }

    if (!companies || companies.length === 0) {
      console.log(`[DISPATCH-FLEXIBLE] No matching companies for job ${jobId}`)
      return NextResponse.json({ success: true, dispatched: 0 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.openjobmarket.com'
    const jobUrl  = `${baseUrl}/jobs/${jobId}`

    const pushTitle = `📋 Flexible job nearby: ${job.title ?? 'New job'}`
    const pushBody  = job.location
      ? `New flexible job posted in ${job.location}. Apply at your convenience.`
      : 'A new flexible job matching your trade has been posted. Apply at your convenience.'

    let dispatched = 0

    const posterCompanyId = (job as any)?.company_id as string | null | undefined

    for (const company of companies as Array<{ company_id: string; user_id: string; company_name: string; distance_miles: number; language_score?: number }>) {
      // Skip the job poster — they must not receive notifications about their own job
      if (posterCompanyId && company.company_id === posterCompanyId) {
        console.log(`[DISPATCH-FLEXIBLE] Skipping poster ${posterCompanyId}`)
        continue
      }
      try {
        // Dedup: mark as notified so no second dispatch arrives
        await admin
          .from('job_notifications_sent')
          .upsert(
            { job_id: jobId, company_id: company.company_id },
            { onConflict: 'job_id,company_id' }
          )

        // In-app notification (appears in the bell icon)
        const { error: notifErr } = await admin.from('notifications').insert({
          user_id:  company.user_id,
          type:     'trade_job_match',
          title:    pushTitle,
          message:  pushBody,
          link_url: jobUrl,
          is_read:  false,
        })
        if (notifErr) {
          console.error('[DISPATCH-FLEXIBLE] In-app notif error:', notifErr.message)
        }

        // Push notifications — split web (VAPID) and FCM (Android) tokens
        // Filter to tokens active in the last 90 days (last_seen IS NULL = pre-migration, treat as alive)
        const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        const { data: tokenRows } = await admin
          .from('user_push_tokens')
          .select('token, device_type')
          .eq('user_id', company.user_id)
          .or(`last_seen.is.null,last_seen.gte.${cutoff90}`)

        const webTokens = (tokenRows ?? [])
          .filter((r: { token: string; device_type: string }) => r.device_type === 'web')
          .map((r: { token: string; device_type: string }) => r.token)

        const nativeRows = (tokenRows ?? [])
          .filter((r: { token: string; device_type: string }) => r.device_type === 'fcm' || r.device_type === 'apns')

        if (webTokens.length > 0) {
          try {
            const { expired } = await sendWebPushToUser(webTokens, {
              title: pushTitle,
              body:  pushBody,
              url:   jobUrl,
              tag:   `flexible-job-${jobId}`,
              requireInteraction: false,
            })
            if (expired.length > 0) {
              await admin.from('user_push_tokens').delete().in('token', expired)
            }
          } catch (pushErr: any) {
            console.error('[DISPATCH-FLEXIBLE] Web push error:', pushErr?.message)
          }
        }

        if (nativeRows.length > 0) {
          try {
            const { failed } = await sendNativePush(nativeRows, {
              title:  pushTitle,
              body:   pushBody,
              url:    jobUrl,
              tag:    `flexible-job-${jobId}`,
              jobId,
            })
            if (failed.length > 0) {
              await admin.from('user_push_tokens').delete().in('token', failed)
            }
          } catch (nativeErr: any) {
            console.error('[DISPATCH-FLEXIBLE] Native push error:', nativeErr?.message)
          }
        }

        dispatched++
      } catch (companyErr) {
        console.error('[DISPATCH-FLEXIBLE] Error notifying company:', company.company_id, companyErr)
      }
    }

    console.log(`[DISPATCH-FLEXIBLE] job=${jobId} dispatched=${dispatched}/${companies.length}`, {
      top10: (companies as any[]).slice(0, 10).map(c => ({
        id:        c.company_id,
        name:      c.company_name,
        dist_mi:   c.distance_miles?.toFixed(2),
        lang_bonus: c.language_score,
      })),
    })
    return NextResponse.json({ success: true, dispatched, total: companies.length })

  } catch (err: any) {
    console.error('[DISPATCH-FLEXIBLE] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
