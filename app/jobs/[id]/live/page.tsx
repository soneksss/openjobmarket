export const dynamic = "force-dynamic"

import { createClient, createAdminClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import { FindingTradesView } from "@/components/finding-trades-view"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LiveJobPage({ params }: PageProps) {
  const { id: jobId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/auth/login")

  // Admin client bypasses RLS. If the service-role key is missing in env,
  // fall back to the user client (RLS may still allow the owner to read).
  let admin: Awaited<ReturnType<typeof createClient>>
  try {
    admin = createAdminClient() as any
  } catch {
    console.warn("[LIVE-PAGE] createAdminClient failed — falling back to user client")
    admin = supabase
  }

  // Retry up to 5 times with increasing delays.
  // Delays are the pause BEFORE each attempt; total wait ≤ 10 s.
  // This covers INSERT propagation lag on free-tier Supabase.
  const DELAYS_MS = [0, 800, 1500, 2500, 3500]
  let job: {
    id: string
    title: string
    location: string
    latitude: number | null
    longitude: number | null
    urgency_type: string | null
    search_radius_miles: number | null
    expires_at: string | null
    job_state: string | null
    homeowner_id: string | null
    company_id: string | null
  } | null = null

  for (const wait of DELAYS_MS) {
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))

    const { data, error } = await admin
      .from("jobs")
      .select("id, title, location, latitude, longitude, urgency_type, search_radius_miles, expires_at, job_state, homeowner_id, company_id")
      .eq("id", jobId)
      .maybeSingle()

    if (error) {
      // Unexpected DB error — log and keep retrying
      console.warn(`[LIVE-PAGE] Query error on attempt (wait=${wait}ms):`, error.message)
      continue
    }

    if (data) {
      job = data
      break
    }

    console.warn(`[LIVE-PAGE] Job ${jobId} not found yet (wait=${wait}ms) — retrying…`)
  }

  if (!job) {
    console.error("[LIVE-PAGE] Job not found after all retries:", jobId)
    notFound()
  }

  // Verify the logged-in user owns this job
  let isOwner = false

  if (job.homeowner_id) {
    const { data: hp } = await supabase
      .from("homeowner_profiles")
      .select("id")
      .eq("id", job.homeowner_id)
      .eq("user_id", user!.id)
      .maybeSingle()
    if (hp) isOwner = true
  }

  if (!isOwner && job.company_id) {
    const { data: cp } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("id", job.company_id)
      .eq("user_id", user!.id)
      .maybeSingle()
    if (cp) isOwner = true
  }

  if (!isOwner) redirect("/dashboard")

  return (
    <FindingTradesView
      job={{
        id:                  job.id,
        title:               job.title,
        location:            job.location,
        latitude:            job.latitude            ?? null,
        longitude:           job.longitude           ?? null,
        urgency_type:        job.urgency_type        ?? null,
        search_radius_miles: job.search_radius_miles ?? null,
        expires_at:          job.expires_at          ?? null,
        job_state:           job.job_state           ?? null,
      }}
      userId={user!.id}
    />
  )
}
