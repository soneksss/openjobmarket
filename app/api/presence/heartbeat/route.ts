export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // Always identify the caller from the JWT — never trust a client-sent user_id
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only write last_seen_at — is_online is deprecated and must not be used
    const { error } = await supabase
      .from("users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id)

    // Fail silently if the column doesn't exist yet (migration pending)
    if (error && !error.message.includes("column")) {
      console.error("[HEARTBEAT]", error.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[HEARTBEAT] unexpected error", err)
    return NextResponse.json({ ok: true }) // always 200 — never block the user
  }
}
