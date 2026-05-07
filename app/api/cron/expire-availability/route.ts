import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedToken = process.env.CRON_SECRET_TOKEN
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("company_profiles")
      .update({ open_for_business: false })
      .eq("open_for_business", true)
      .lt("availability_expires_at", new Date().toISOString())
      .select("user_id")

    if (error) {
      console.error("[CRON expire-availability]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[CRON expire-availability] Expired ${data?.length ?? 0} traders`)
    return NextResponse.json({ success: true, expired: data?.length ?? 0 })
  } catch (err) {
    console.error("[CRON expire-availability]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
