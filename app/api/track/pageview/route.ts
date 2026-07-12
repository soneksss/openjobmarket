export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"

/**
 * POST /api/track/pageview
 *
 * First-party pageview logging — no cookies read, no PII stored. visitorId
 * is a random client-generated ID (see components/pageview-tracker.tsx).
 * Always returns 200 quickly; failures here should never affect the page.
 */
export async function POST(req: NextRequest) {
  try {
    const { path, visitorId } = await req.json()
    if (!path || !visitorId || typeof path !== "string" || typeof visitorId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const admin = createAdminClient()
    await admin.from("page_views").insert({ path: path.slice(0, 512), visitor_id: visitorId.slice(0, 128) })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[TRACK-PAGEVIEW] error:", err)
    return NextResponse.json({ ok: false })
  }
}
