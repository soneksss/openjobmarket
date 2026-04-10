import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/jobs/[id]/mark-viewed
 *
 * Called when a tradesperson opens a job they were urgently dispatched to.
 * Sets viewed_at on their urgent_job_dispatch_alerts row so the homeowner's
 * live-search view can show "Reviewing your job" (blue state).
 *
 * Fails silently — viewed_at column may not exist in older DB schemas.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false })

    const admin = createAdminClient()

    // Find this user's company profile
    const { data: cp } = await admin
      .from("company_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!cp?.id) return NextResponse.json({ success: false })

    // Update viewed_at — only if not already set and row exists
    // Wrapped in try-catch: fails gracefully if viewed_at column doesn't exist yet.
    try {
      await admin
        .from("urgent_job_dispatch_alerts")
        .update({ viewed_at: new Date().toISOString() } as any)
        .eq("job_id", jobId)
        .eq("company_id", cp.id)
        .is("viewed_at" as any, null)
    } catch {
      // Column doesn't exist — not a blocking error
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false })
  }
}
