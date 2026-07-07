export const dynamic = "force-dynamic"

import { createClient, createAdminClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import { HiredJobTrackingView } from "@/components/hired-job-tracking-view"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function HiredJobTrackPage({ params }: PageProps) {
  const { id: jobId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/auth/login")

  let admin: Awaited<ReturnType<typeof createClient>>
  try {
    admin = createAdminClient() as any
  } catch {
    admin = supabase
  }

  // Fetch job with confirmed tradesperson
  const { data: job } = await admin
    .from("jobs")
    .select("id, title, location, latitude, longitude, status, homeowner_id, company_id, confirmed_tradesperson_id")
    .eq("id", jobId)
    .maybeSingle()

  if (!job) notFound()

  // Verify the caller owns this job
  let isOwner = false
  if (job.homeowner_id) {
    const { data: hp } = await supabase
      .from("homeowner_profiles")
      .select("id")
      .eq("id", job.homeowner_id)
      .eq("user_id", user.id)
      .maybeSingle()
    if (hp) isOwner = true
  }
  if (!isOwner && job.company_id) {
    const { data: cp } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("id", job.company_id)
      .eq("user_id", user.id)
      .maybeSingle()
    if (cp) isOwner = true
  }
  if (!isOwner) redirect("/dashboard")

  // Must have a confirmed tradesperson — otherwise this page makes no sense
  if (!job.confirmed_tradesperson_id) redirect(`/jobs/${jobId}/live`)

  // Fetch hired tradesperson profile
  const { data: trade } = await admin
    .from("company_profiles")
    .select("id, user_id, company_name, logo_url, latitude, longitude")
    .eq("id", job.confirmed_tradesperson_id)
    .maybeSingle()

  if (!trade) notFound()

  // Find the conversation between homeowner and tradesperson (for the Message button)
  let conversationId: string | null = null
  try {
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${trade.user_id}),` +
        `and(participant_1.eq.${trade.user_id},participant_2.eq.${user.id})`
      )
      .limit(1)
      .maybeSingle()
    conversationId = conv?.id ?? null
  } catch {
    // Non-fatal — the Message button falls back to /messages/{userId}
  }

  return (
    <HiredJobTrackingView
      job={{
        id:        job.id,
        title:     job.title,
        location:  job.location,
        latitude:  job.latitude  ?? null,
        longitude: job.longitude ?? null,
        status:    job.status    ?? null,
      }}
      trade={{
        id:        trade.id,
        userId:    trade.user_id,
        name:      trade.company_name || "Tradesperson",
        logoUrl:   trade.logo_url ?? null,
        latitude:  trade.latitude  ?? null,
        longitude: trade.longitude ?? null,
      }}
      conversationId={conversationId}
    />
  )
}
