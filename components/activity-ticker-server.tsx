import { createClient } from "@/lib/server"
import ActivityTickerCard, { ActivityTickerItem } from "./activity-ticker-card"

// ─── City extractor ───────────────────────────────────────────────────────────
// UK addresses: "12 High Street, Portsmouth, Hampshire, PO1 1AA"
// Rule: skip the first comma-segment if it contains a digit (house number / road).
function extractCity(location: string | null): string | null {
  if (!location) return null
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean)
  for (const part of parts) {
    // Skip segments that look like street numbers / postcodes
    if (/\d/.test(part)) continue
    // Skip very short segments (single letters / abbreviations)
    if (part.length < 3) continue
    return part
  }
  return null
}

// ─── Data fetch ───────────────────────────────────────────────────────────────
async function fetchTickerItems(): Promise<ActivityTickerItem[]> {
  try {
    const supabase = await createClient()

    // Fetch recently completed trade jobs
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, location, completed_at, job_category")
      .eq("status", "COMPLETED")
      .eq("is_tradespeople_job", true)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(20)

    if (jobsError || !jobs || jobs.length === 0) return []

    // Fetch the best (highest) review rating for each job
    const jobIds = jobs.map((j) => j.id)
    const { data: reviews } = await supabase
      .from("reviews")
      .select("job_id, rating")
      .in("job_id", jobIds)
      .order("rating", { ascending: false })

    // Map job_id → best rating
    const ratingMap: Record<string, number> = {}
    for (const r of reviews ?? []) {
      if (!ratingMap[r.job_id] || r.rating > ratingMap[r.job_id]) {
        ratingMap[r.job_id] = r.rating
      }
    }

    // Build ticker items
    const items: ActivityTickerItem[] = []
    for (const job of jobs) {
      const city = extractCity(job.location)
      if (!city) continue

      const label = job.job_category || job.title || "Trade"
      const rating = ratingMap[job.id]
      const text = rating
        ? `${label} completed in ${city} · ${rating}⭐`
        : `${label} job completed in ${city}`

      items.push({ type: "activity", text })
    }

    return items
  } catch {
    // Silently fall back to built-in fallback data in the card
    return []
  }
}

// ─── Server Component ─────────────────────────────────────────────────────────
export default async function ActivityTickerServer({
  className,
  minIntervalMs,
  maxIntervalMs,
}: {
  className?: string
  minIntervalMs?: number
  maxIntervalMs?: number
}) {
  const items = await fetchTickerItems()

  return (
    <ActivityTickerCard
      items={items}
      minIntervalMs={minIntervalMs}
      maxIntervalMs={maxIntervalMs}
      className={className}
    />
  )
}
