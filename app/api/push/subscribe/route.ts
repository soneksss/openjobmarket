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
    const { error } = await admin.from("user_push_tokens").upsert(
      {
        user_id:     user.id,
        token:       JSON.stringify(subscription),
        device_type: "web",
      },
      { onConflict: "user_id,token" }
    )

    if (error) {
      console.error("[PUSH-SUBSCRIBE] DB error:", error.message)
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

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
