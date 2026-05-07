export const dynamic = 'force-dynamic'

import { createAdminClient } from "@/lib/server"
import TradespeopleFindMap from "@/components/tradespeople-find-map"

const DEFAULT_COORDS: [number, number] = [51.5074, -0.1278] // London

export default async function FindPage({
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
  const { data: traders } = await admin.rpc("search_traders", {
    p_lat: coords[0],
    p_lon: coords[1],
    p_radius_miles: 10,
    p_search: industry ?? null,
    p_limit: 60,
  })

  return (
    <div className="fixed inset-0 bg-slate-900">
      <TradespeopleFindMap
        initialTraders={(traders ?? []) as any[]}
        initialCoords={coords}
        initialPostcode={postcode}
        initialIndustry={industry}
      />
    </div>
  )
}
