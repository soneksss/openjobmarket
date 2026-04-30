import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

/** POST /api/push/subscribe — save a PushSubscription for the current user */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const subscription = body?.subscription
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 })
    }

    const admin = createAdminClient()
    const tokenStr = JSON.stringify(subscription)

    // Resolve role
    const [{ data: company }, { data: homeowner }] = await Promise.all([
      admin.from('company_profiles').select('id').eq('user_id', user.id).maybeSingle(),
      admin.from('homeowner_profiles').select('id').eq('user_id', user.id).maybeSingle(),
    ])
    const role = company ? 'tradesperson' : homeowner ? 'homeowner' : null

    // Delete any stale row for this token (same browser re-registering, or previous user)
    await admin.from("user_push_tokens").delete().eq("token", tokenStr)

    const row: Record<string, unknown> = { user_id: user.id, token: tokenStr, device_type: "web", platform: "web" }
    if (role !== null) row.role = role
    try { row.last_seen = new Date().toISOString() } catch { /* ignore */ }

    const { error } = await admin.from("user_push_tokens").insert(row)

    if (error) {
      console.error("[PUSH-SUBSCRIBE] DB error:", error.message)
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

    console.log(`[PUSH-SUBSCRIBE] user=${user.id} role=${role} web token saved`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[PUSH-SUBSCRIBE] Fatal:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** DELETE /api/push/subscribe — remove a PushSubscription (user unsubscribed) */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const subscription = body?.subscription
    if (!subscription) return NextResponse.json({ success: true })

    const admin = createAdminClient()
    await admin
      .from("user_push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", JSON.stringify(subscription))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[PUSH-UNSUBSCRIBE] Fatal:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
