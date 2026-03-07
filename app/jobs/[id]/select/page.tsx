export const dynamic = "force-dynamic"

import { createClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import { ManualTradeSelect, type Tradesperson } from "@/components/manual-trade-select"

interface PageProps {
  params: Promise<{ id: string }>
}

/** Haversine distance in miles between two lat/lon points */
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default async function SelectTradePage({ params }: PageProps) {
  const { id: jobId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/auth/login")

  /* ── fetch the job ── */
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      id, title, location, latitude, longitude,
      urgency_type,
      homeowner_id, company_id,
      homeowner_profiles ( user_id, first_name, last_name ),
      company_profiles   ( user_id, company_name )
    `)
    .eq("id", jobId)
    .single()

  if (jobError || !job) notFound()

  /* ── verify ownership ── */
  const isOwner =
    (job.homeowner_id && (job.homeowner_profiles as any)?.user_id === user.id) ||
    (job.company_id   && (job.company_profiles   as any)?.user_id === user.id)

  if (!isOwner) redirect("/dashboard")

  const jobLat = job.latitude  ?? 51.5074
  const jobLon = job.longitude ?? -0.1278
  const radiusLimit = 25 // max miles to fetch

  /* ── poster display name ── */
  const hp = job.homeowner_profiles as any
  const cp = job.company_profiles   as any
  const posterName =
    hp?.first_name
      ? `${hp.first_name} ${hp.last_name ?? ""}`.trim()
      : cp?.company_name ?? "Job Poster"

  /* ── fetch professionals ── */
  const { data: profs = [] } = await supabase
    .from("professional_profiles")
    .select(`
      id, user_id, first_name, last_name, title,
      profile_photo_url, latitude, longitude, location,
      skills, average_rating, reviews_count, availability
    `)
    .eq("available_for_work", true)
    .not("latitude",  "is", null)
    .not("longitude", "is", null)

  /* ── fetch companies ── */
  const { data: companies = [] } = await supabase
    .from("company_profiles")
    .select(`
      id, user_id, company_name, logo_url, latitude, longitude,
      location, industry, services, open_for_business, trade_job_notifications
    `)
    .eq("open_for_business",     true)
    .eq("trade_job_notifications", true)
    .not("latitude",  "is", null)
    .not("longitude", "is", null)

  /* ── combine + filter by radius + sort ── */
  const tradespeople: Tradesperson[] = []

  for (const p of profs ?? []) {
    if (!p.latitude || !p.longitude) continue
    const dist = haversineMiles(jobLat, jobLon, p.latitude, p.longitude)
    if (dist > radiusLimit) continue
    tradespeople.push({
      id:            p.id,
      type:          "professional",
      name:          `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Professional",
      photoUrl:      p.profile_photo_url ?? null,
      lat:           p.latitude,
      lon:           p.longitude,
      location:      p.location ?? "",
      distanceMiles: dist,
      rating:        p.average_rating  ?? 0,
      reviewCount:   p.reviews_count   ?? 0,
      skills:        Array.isArray(p.skills) ? p.skills : [],
      title:         p.title ?? undefined,
      availability:  p.availability ?? undefined,
    })
  }

  for (const c of companies ?? []) {
    if (!c.latitude || !c.longitude) continue
    const dist = haversineMiles(jobLat, jobLon, c.latitude, c.longitude)
    if (dist > radiusLimit) continue
    tradespeople.push({
      id:            c.id,
      type:          "company",
      name:          c.company_name ?? "Company",
      photoUrl:      c.logo_url ?? null,
      lat:           c.latitude,
      lon:           c.longitude,
      location:      c.location ?? "",
      distanceMiles: dist,
      rating:        0,
      reviewCount:   0,
      skills:        Array.isArray(c.services) ? c.services : [],
      industry:      c.industry ?? undefined,
      service24_7:   false,
    })
  }

  tradespeople.sort((a, b) => a.distanceMiles - b.distanceMiles)

  return (
    <ManualTradeSelect
      job={{
        id:           job.id,
        title:        job.title,
        location:     job.location,
        latitude:     job.latitude,
        longitude:    job.longitude,
        urgency_type: job.urgency_type,
      }}
      tradespeople={tradespeople}
      userId={user.id}
      posterName={posterName}
    />
  )
}
