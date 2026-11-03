export const dynamic = 'force-dynamic'

import JobsFindMap from "@/components/jobs-find-map"
import WelcomeGuide from "@/components/welcome-guide"
import { createClient } from "@/lib/server"
import { mapStart } from "@/lib/geo-server"

export default async function FindJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ postcode?: string; lat?: string; lng?: string; industry?: string; industries?: string }>
}) {
  const { postcode, lat, lng, industry, industries } = await searchParams
  const initialIndustries = industries
    ? industries.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined

  // Drives the "sign up" prompts in the list panel — shown to visitors only.
  let isSignedIn = false
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    isSignedIn = !!data.user
  } catch {
    // treat as signed out
  }

  const { coords, coordsAreDefault } = await mapStart({ lat, lng, postcode })

  return (
    <div className="fixed left-0 right-0 bottom-0 bg-slate-950" style={{ top: "var(--global-header-h, 0px)" }}>
      <JobsFindMap
        initialJobs={[]}
        initialCoords={coords}
        initialPostcode={postcode}
        initialIndustry={industry}
        initialIndustries={initialIndustries}
        animateZoom={!!(lat && lng)}
        coordsAreDefault={coordsAreDefault}
        isSignedIn={isSignedIn}
      />
      {!isSignedIn && <WelcomeGuide page="jobs" />}
    </div>
  )
}
