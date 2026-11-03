export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import TradespeopleFindMap from "@/components/tradespeople-find-map"
import { mapStart } from "@/lib/geo-server"

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ postcode?: string; lat?: string; lng?: string; industry?: string; radius?: string; subcats?: string; lang?: string; available?: string; h24?: string }>
}) {
  const { postcode, lat, lng, industry } = await searchParams

  const start = await mapStart({ lat, lng, postcode })
  let coords = start.coords
  let coordsAreDefault = start.coordsAreDefault

  // No postcode/lat given: prefer the signed-in homeowner's saved location over the IP area.
  if (coordsAreDefault) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .rpc("get_my_homeowner_profile")
          .maybeSingle<any>()
        const profileLat = profile?.latitude ?? profile?.latitude_approx
        const profileLon = profile?.longitude ?? profile?.longitude_approx
        if (profileLat && profileLon) {
          coords = [profileLat, profileLon]
          coordsAreDefault = false
        }
      }
    } catch {
      // keep the visitor's area
    }
  }

  return (
    <div className="fixed left-0 right-0 bottom-0 bg-slate-900" style={{ top: "var(--global-header-h, 0px)" }}>
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
