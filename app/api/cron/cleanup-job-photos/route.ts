import { createAdminWriteClient } from '@/lib/server'
import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/cron-auth'

/**
 * GET /api/cron/cleanup-job-photos
 *
 * Runs daily (03:30 UTC via Vercel Cron). Deletes job photos once their job has
 * stayed closed for more than 30 days, plus photos no job points at any more.
 * The rule lives in job_photos_due_for_cleanup() (migration 20261104000002);
 * reopening or editing a job restarts its 30 days.
 */
export async function GET(request: NextRequest) {
  const unauth = verifyCronRequest(request)
  if (unauth) return unauth

  try {
    const admin = createAdminWriteClient()

    const { data, error } = await admin.rpc('job_photos_due_for_cleanup', { p_limit: 500 })
    if (error) {
      console.error('[CLEANUP-JOB-PHOTOS] Lookup error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as { job_id: string | null; path: string }[]
    const paths = [...new Set(rows.map(r => r.path).filter(Boolean))]
    if (paths.length === 0) return NextResponse.json({ success: true, removed: 0 })

    const { error: removeError } = await admin.storage.from('job-photos').remove(paths)
    if (removeError) {
      console.error('[CLEANUP-JOB-PHOTOS] Storage remove error:', removeError.message)
      return NextResponse.json({ error: removeError.message }, { status: 500 })
    }

    const jobIds = rows.map(r => r.job_id).filter((id): id is string => !!id)
    if (jobIds.length > 0) {
      const { error: updateError } = await admin.from('jobs').update({ job_photo_url: null }).in('id', jobIds)
      if (updateError) console.error('[CLEANUP-JOB-PHOTOS] Clearing job_photo_url failed:', updateError.message)
    }

    console.log(`[CLEANUP-JOB-PHOTOS] Removed ${paths.length} photo(s), cleared ${jobIds.length} job(s)`)
    return NextResponse.json({ success: true, removed: paths.length, jobsCleared: jobIds.length })
  } catch (err) {
    console.error('[CLEANUP-JOB-PHOTOS] Fatal:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
