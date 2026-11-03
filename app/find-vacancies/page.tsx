export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import JobsFindMap from "@/components/jobs-find-map"
import WelcomeGuide from "@/components/welcome-guide"
import { createClient } from "@/lib/server"
import { mapStart } from "@/lib/geo-server"

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

  const { coords, coordsAreDefault } = await mapStart({ lat, lng, postcode })

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
