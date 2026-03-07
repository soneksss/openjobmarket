export const dynamic = "force-dynamic"

import { createClient } from "@/lib/server"
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

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      id, title, location, latitude, longitude,
      urgency_type, search_radius_miles,
      homeowner_id, company_id,
      homeowner_profiles ( user_id ),
      company_profiles   ( user_id )
    `)
    .eq("id", jobId)
    .single()

  if (jobError || !job) notFound()

  // Verify ownership
  const isOwner =
    (job.homeowner_id && (job.homeowner_profiles as any)?.user_id === user.id) ||
    (job.company_id   && (job.company_profiles   as any)?.user_id === user.id)

  if (!isOwner) redirect("/dashboard")

  return (
    <FindingTradesView
      job={{
        id:                  job.id,
        title:               job.title,
        location:            job.location,
        latitude:            job.latitude,
        longitude:           job.longitude,
        urgency_type:        job.urgency_type,
        search_radius_miles: job.search_radius_miles,
      }}
      userId={user.id}
    />
  )
}
