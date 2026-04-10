import { redirect } from "next/navigation"

/**
 * /find-trades?category=...&lat=...&lng=...&radius=...
 *
 * Redirects to the homepage live-map flow so the homeowner gets the same
 * full ProfessionalsPageContent experience (map + expandable trade cards).
 */
export default async function FindTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; lat?: string; lng?: string; radius?: string }>
}) {
  const sp = await searchParams
  const params = new URLSearchParams({
    tab:        "traders",
    search:     sp.category || "",
    lat:        sp.lat     || "51.5074",
    lng:        sp.lng     || "-0.1278",
    radius:     sp.radius  || "5",
    autoSearch: "true",
  })
  redirect(`/?${params}`)
}
