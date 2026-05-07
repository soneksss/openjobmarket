export const dynamic = 'force-dynamic'

import { createAdminClient } from "@/lib/server"
import JobsFindMap from "@/components/jobs-find-map"

const DEFAULT_COORDS: [number, number] = [51.5074, -0.1278]

export default async function FindJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ postcode?: string; lat?: string; lng?: string; industry?: string }>
}) {
  const { postcode, lat, lng, industry } = await searchParams

  let coords: [number, number] = DEFAULT_COORDS

  if (lat && lng) {
    coords = [parseFloat(lat), parseFloat(lng)]
  } else if (postcode) {
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postcode)}&limit=1&countrycodes=gb`,
        { headers: { "User-Agent": "OpenJobMarket/1.0 contact@openjobmarket.com" }, next: { revalidate: 3600 } }
      )
      const geoData = await geo.json()
      if (geoData?.[0]) {
        coords = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)]
      }
    } catch {
      // fall back to London
    }
  }

  const admin = createAdminClient()
  const radiusMiles = 10
  const latDelta = radiusMiles / 69
  const lngDelta = radiusMiles / (69 * Math.cos((coords[0] * Math.PI) / 180))

  const { data: jobs } = await admin
    .from("jobs")
    .select(`
      id, title, short_description, location, latitude, longitude,
      latitude_approx, longitude_approx, location_type,
      budget_min, budget_max, urgency_type, job_photo_url, industry, category,
      created_at,
      homeowner_profiles!homeowner_id(first_name, last_name, profile_photo_url, user_id)
    `)
    .eq("status", "POSTED")
    .eq("is_active", true)
    .eq("is_tradespeople_job", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .or(
      `latitude.is.null,and(latitude.gte.${coords[0] - latDelta},latitude.lte.${coords[0] + latDelta},longitude.gte.${coords[1] - lngDelta},longitude.lte.${coords[1] + lngDelta})`
    )
    .order("created_at", { ascending: false })
    .limit(80)

  return (
    <div className="fixed inset-0 bg-slate-950">
      <JobsFindMap
        initialJobs={(jobs ?? []) as any[]}
        initialCoords={coords}
        initialPostcode={postcode}
        initialIndustry={industry}
      />
    </div>
  )
}
