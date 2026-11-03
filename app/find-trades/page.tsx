export const dynamic = 'force-dynamic'

import { Suspense } from "react"
import TradespeopleFindMap from "@/components/tradespeople-find-map"
import WelcomeGuide from "@/components/welcome-guide"
import { mapStart } from "@/lib/geo-server"

export default async function FindTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; lat?: string; lng?: string; postcode?: string }>
}) {
  const { category, lat, lng, postcode } = await searchParams
  const { coords, coordsAreDefault } = await mapStart({ lat, lng, postcode })

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
      <WelcomeGuide page="trades" />
    </div>
  )
}
