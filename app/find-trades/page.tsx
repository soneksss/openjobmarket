export const dynamic = 'force-dynamic'

import { Suspense } from "react"
import TradespeopleFindMap from "@/components/tradespeople-find-map"

const DEFAULT_COORDS: [number, number] = [50.8058, -1.0872] // Portsmouth

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
    <div className="fixed left-0 right-0 bottom-0 bg-slate-950" style={{ top: "var(--global-header-h, 0px)" }}>
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
