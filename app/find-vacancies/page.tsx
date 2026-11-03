export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import JobsFindMap from "@/components/jobs-find-map"
import WelcomeGuide from "@/components/welcome-guide"
import { createClient } from "@/lib/server"

const DEFAULT_COORDS: [number, number] = [50.8058, -1.0872] // Portsmouth

// The Vacancies tab: company job adverts on the same map as trade jobs.
export default async function FindVacanciesPage({
  searchParams,
}: {
  searchParams: Promise<{ postcode?: string; lat?: string; lng?: string }>
}) {
  const { postcode, lat, lng } = await searchParams

  const supabase = await createClient()
  const [{ data: vacanciesOn }, { data: auth }] = await Promise.all([
    supabase.rpc("is_vacancy_system_enabled"),
    supabase.auth.getUser().catch(() => ({ data: { user: null } })),
  ])
  // The vacancy_system feature flag switches vacancies off; the tab then falls back to trade jobs.
  if (vacanciesOn !== true) {
    redirect(lat && lng ? `/find-jobs?lat=${lat}&lng=${lng}` : "/find-jobs")
  }
  const user = auth?.user ?? null
  const isSignedIn = !!user

  // Only business accounts can post vacancies; signed-out visitors are offered the employer sign-up.
  let canPostVacancy = !isSignedIn
  if (user) {
    const { data: row } = await supabase.from("users").select("user_type").eq("id", user.id).maybeSingle()
    canPostVacancy = row?.user_type === "company"
  }

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
      // fall back to the default area
    }
  }

  return (
    <div className="fixed left-0 right-0 bottom-0 bg-slate-950" style={{ top: "var(--global-header-h, 0px)" }}>
      <JobsFindMap
        mode="vacancy"
        initialJobs={[]}
        initialCoords={coords}
        initialPostcode={postcode}
        coordsAreDefault={coordsAreDefault}
        isSignedIn={isSignedIn}
        canPostVacancy={canPostVacancy}
      />
      {!isSignedIn && <WelcomeGuide page="vacancies" />}
    </div>
  )
}
