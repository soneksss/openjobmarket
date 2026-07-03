export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import TradespeopleFindMap from "@/components/tradespeople-find-map"

const DEFAULT_COORDS: [number, number] = [50.8058, -1.0872] // Portsmouth

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ postcode?: string; lat?: string; lng?: string; industry?: string; radius?: string; subcats?: string; lang?: string; available?: string; h24?: string }>
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
      // fall back to user location or London
    }
  }

  // If still on default coords (no postcode/lat given), try user's saved location
  if (coords === DEFAULT_COORDS) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("homeowner_profiles")
          .select("latitude, longitude, latitude_approx, longitude_approx")
          .eq("user_id", user.id)
          .maybeSingle()
        const profileLat = profile?.latitude ?? profile?.latitude_approx
        const profileLon = profile?.longitude ?? profile?.longitude_approx
        if (profileLat && profileLon) {
          coords = [profileLat, profileLon]
        }
      }
    } catch {
      // fall back to Portsmouth default
    }
  }

  const coordsAreDefault = coords === DEFAULT_COORDS

  return (
    <div className="fixed inset-0 bg-slate-900">
      <TradespeopleFindMap
        initialTraders={[]}
        initialCoords={coords}
        initialPostcode={postcode}
        initialIndustry={industry}
        coordsAreDefault={coordsAreDefault}
      />
    </div>
  )
}
