import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// GET — homeowner polls the confirmed tradesperson's live location
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  const { data: job } = await admin
    .from("jobs")
    .select("latitude, longitude, location, title, confirmed_tradesperson_id, homeowner_id, company_id")
    .eq("id", jobId)
    .maybeSingle()

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Verify caller owns the job
  let isOwner = false
  if (job.homeowner_id) {
    const { data: hp } = await admin
      .from("homeowner_profiles")
      .select("user_id")
      .eq("id", job.homeowner_id)
      .maybeSingle()
    isOwner = hp?.user_id === user.id
  }
  if (!isOwner && job.company_id) {
    const { data: cp } = await admin
      .from("company_profiles")
      .select("user_id")
      .eq("id", job.company_id)
      .maybeSingle()
    isOwner = cp?.user_id === user.id
  }

  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!job.confirmed_tradesperson_id) {
    return NextResponse.json({ error: "No tradesperson confirmed yet" }, { status: 404 })
  }

  const { data: cp } = await admin
    .from("company_profiles")
    .select("id, company_name, logo_url, latitude, longitude")
    .eq("id", job.confirmed_tradesperson_id)
    .maybeSingle()

  return NextResponse.json({
    jobLat:       job.latitude,
    jobLng:       job.longitude,
    jobLocation:  job.location,
    jobTitle:     job.title,
    tradeLat:     cp?.latitude  ?? null,
    tradeLng:     cp?.longitude ?? null,
    tradeName:    cp?.company_name ?? "Tradesperson",
    tradeAvatarUrl: cp?.logo_url ?? null,
  })
}

// POST — tradesperson broadcasts their current GPS location for a confirmed job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let lat: number, lng: number
  try {
    const body = await request.json()
    lat = Number(body.lat)
    lng = Number(body.lng)
    if (!isFinite(lat) || !isFinite(lng)) throw new Error("bad coords")
  } catch {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch job and verify this user is the confirmed tradesperson
  const { data: job } = await admin
    .from("jobs")
    .select("confirmed_tradesperson_id")
    .eq("id", jobId)
    .maybeSingle()

  if (!job?.confirmed_tradesperson_id) {
    return NextResponse.json({ error: "Job not found or not confirmed" }, { status: 404 })
  }

  // Ensure the caller's profile matches the confirmed tradesperson slot
  const { data: cp } = await admin
    .from("company_profiles")
    .select("id")
    .eq("id", job.confirmed_tradesperson_id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!cp) return NextResponse.json({ error: "Not the confirmed tradesperson" }, { status: 403 })

  const { error } = await admin
    .from("company_profiles")
    .update({ latitude: lat, longitude: lng })
    .eq("id", cp.id)

  if (error) {
    console.error("[TRACK POST]", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
