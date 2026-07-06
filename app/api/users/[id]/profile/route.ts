import { createClient, createAdminClient } from "@/lib/server"
import { type NextRequest, NextResponse } from "next/server"

// Returns basic public profile info for any user, using the admin client to
// bypass RLS. Only authenticated users may call this — it's used by the
// messaging UI to show the other participant's name/avatar when RLS on
// company_profiles would otherwise block a company-to-company read.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: userData, error: userErr } = await admin
    .from("users")
    .select("user_type, full_name, nickname, profile_photo_url")
    .eq("id", targetUserId)
    .maybeSingle()

  if (userErr || !userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  let name: string | null = userData.nickname || userData.full_name || null
  let avatar_url: string | null = userData.profile_photo_url ?? null
  let profile_id: string | null = null
  let profile_url: string | null = null

  if (userData.user_type === "company" || userData.user_type === "professional") {
    const { data: cp } = await admin
      .from("company_profiles")
      .select("id, company_name, logo_url")
      .eq("user_id", targetUserId)
      .maybeSingle()

    if (cp) {
      name = cp.company_name || name
      avatar_url = cp.logo_url || avatar_url
      profile_id = cp.id
      profile_url = `/companies/${cp.id}`
    }
  } else if (userData.user_type === "homeowner") {
    const { data: hp } = await admin
      .from("homeowner_profiles")
      .select("id, first_name, last_name, profile_photo_url")
      .eq("user_id", targetUserId)
      .maybeSingle()

    if (hp) {
      const fullName = [hp.first_name, hp.last_name].filter(Boolean).join(" ")
      name = fullName || name
      avatar_url = hp.profile_photo_url || avatar_url
      profile_id = hp.id
      profile_url = `/homeowners/${hp.id}`
    }
  } else if (userData.user_type === "contractor") {
    const { data: ct } = await admin
      .from("contractor_profiles")
      .select("id, company_name, profile_photo_url")
      .eq("user_id", targetUserId)
      .maybeSingle()

    if (ct) {
      name = ct.company_name || name
      avatar_url = ct.profile_photo_url || avatar_url
      profile_id = ct.id
      profile_url = `/contractors/${ct.id}`
    }
  }

  return NextResponse.json({
    name: name || null,
    avatar_url,
    user_type: userData.user_type,
    profile_id,
    profile_url,
  })
}
