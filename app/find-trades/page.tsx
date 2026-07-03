export const dynamic = 'force-dynamic'

import { Suspense } from "react"
import TradespeopleFindMap from "@/components/tradespeople-find-map"

const DEFAULT_COORDS: [number, number] = [51.5074, -0.1278]

export default async function FindTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; lat?: string; lng?: string; postcode?: string }>
}) {
  const { category, lat, lng, postcode } = await searchParams

  let coords: [number, number] = DEFAULT_COORDS
  let coordsAreDefault = true

  if (lat && lng) {
    coords = [parseFloat(lat), parseFloat(lng)]
    coordsAreDefault = false
  } else if (postcode) {
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postcode)}&limit=1&countrycodes=gb`,
        { headers: { "User-Agent": "OpenJobMarket/1.0 contact@openjobmarket.com" }, next: { revalidate: 3600 } }
      )
      const geoData = await geo.json()
      if (geoData?.[0]) {
        coords = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)]
        coordsAreDefault = false
      }
    } catch {
      // fall back to London
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950">
      <Suspense>
        <TradespeopleFindMap
          initialTraders={[]}
          initialCoords={coords}
          initialPostcode={postcode}
          initialIndustry={category}
          coordsAreDefault={coordsAreDefault}
        />
      </Suspense>
    </div>
  )
}
