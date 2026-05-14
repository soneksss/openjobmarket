import { createAdminClient } from '@/lib/server'
import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/cron-auth'

/**
 * GET /api/cron/cleanup-push-tokens
 *
 * Runs weekly (Sunday 03:00 UTC via Vercel Cron).
 * Deletes push tokens whose last_seen is older than 90 days — these belong to
 * uninstalled apps, revoked permissions, or devices that are no longer used.
 * Also removes any tokens where last_seen IS NULL and created_at is 90+ days
 * old (tokens registered before the last_seen column was added).
 */
export async function GET(request: NextRequest) {
  const unauth = verifyCronRequest(request)
  if (unauth) return unauth

  try {
    const admin = createAdminClient()
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await admin
      .from('user_push_tokens')
      .delete()
      .or(`last_seen.lt.${cutoff},and(last_seen.is.null,created_at.lt.${cutoff})`)
      .select('id')

    if (error) {
      console.error('[CLEANUP-PUSH-TOKENS] Delete error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const removed = data?.length ?? 0
    console.log(`[CLEANUP-PUSH-TOKENS] Removed ${removed} stale token(s) (cutoff: ${cutoff})`)
    return NextResponse.json({ success: true, removed })
  } catch (err) {
    console.error('[CLEANUP-PUSH-TOKENS] Fatal:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
