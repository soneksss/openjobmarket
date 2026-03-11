import { createClient } from "@/lib/server"
import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sitemaps | Open Job Market",
  description: "All pages on Open Job Market — find jobs, tradespeople, and more.",
}

const REMOVE_TERMS = ["United Kingdom", "England", "Scotland", "Wales", "Northern Ireland", "UK", "GB", "Great Britain"]
const ADMIN_PREFIXES = ["Borough of ", "City of ", "District of ", "County of ", "Royal Borough of ", "Metropolitan Borough of ", "London Borough of "]
const UK_POSTCODE = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i
const CYRILLIC = /[\u0400-\u04FF]/
const PLACEHOLDER_LOCATIONS = ["location on map", "location", "address", "n/a", "tbd", "tbc", "unknown", ""]

/**
 * Extracts a clean city/area label from a UK address string.
 * Strips: house numbers, street names, postcodes, "United Kingdom", "England", admin prefixes.
 * "31 High Street, South Kensington, London, SW7 1QG, United Kingdom" → "South Kensington, London"
 * "Borough of Runnymede, United Kingdom" → "Runnymede"
 */
function extractCityArea(location: string | null): string {
  if (!location) return ""

  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !REMOVE_TERMS.some((t) => p.toLowerCase() === t.toLowerCase()))
    .filter((p) => !UK_POSTCODE.test(p))
    .filter((p) => !/^\d/.test(p))        // drop parts starting with a digit (house/street numbers)
    .filter((p) => !CYRILLIC.test(p))     // drop Cyrillic (non-English placeholder data)
    .map((p) => {
      for (const prefix of ADMIN_PREFIXES) {
        if (p.startsWith(prefix)) return p.slice(prefix.length)
      }
      return p
    })

  return parts.slice(-2).join(", ")
}

function isPlaceholderLocation(loc: string | null): boolean {
  if (!loc) return true
  if (CYRILLIC.test(loc)) return true
  return PLACEHOLDER_LOCATIONS.includes(loc.toLowerCase().trim())
}

export default async function SitemapPage() {
  const supabase = await createClient()

  // Active trade jobs posted by homeowners only
  const { data: rawJobs } = await supabase
    .from("jobs")
    .select("id, slug, title, location, created_at")
    .eq("is_active", true)
    .eq("is_tradespeople_job", true)
    .eq("status", "open")
    .eq("matching_status", "searching")
    .not("homeowner_id", "is", null)
    .not("title", "is", null)
    .not("location", "is", null)
    .not("description", "is", null)
    .not("title", "ilike", "test%")
    .not("title", "ilike", "demo%")
    .not("title", "ilike", "fake%")
    .gt("title", "aa")
    .order("created_at", { ascending: false })
    .limit(10)

  const jobs = rawJobs || []

  // Featured tradespeople — fetch extra to allow filtering out placeholders
  const { data: rawProfessionals } = await supabase
    .from("company_profiles")
    .select("id, company_name, location")
    .not("company_name", "is", null)
    .not("company_name", "eq", "Tradesperson")
    .not("location", "is", null)
    .not("location", "ilike", "Location on map")
    .order("created_at", { ascending: false })
    .limit(20)

  const professionals = (rawProfessionals || [])
    .filter((p) => !isPlaceholderLocation(p.location) && !CYRILLIC.test(p.company_name ?? ""))
    .slice(0, 5)

  const staticPages = [
    { href: "/",              label: "Home" },
    { href: "/jobs",          label: "Browse Jobs" },
    { href: "/professionals", label: "Find Tradespeople" },
    { href: "/about",         label: "About" },
    { href: "/contact",       label: "Contact" },
    { href: "/terms",         label: "Terms & Conditions" },
    { href: "/privacy",       label: "Privacy Policy" },
  ]

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Sitemaps</h1>
        <p className="text-slate-400 mb-10 text-sm">All public pages on Open Job Market</p>

        {/* Pages */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-emerald-400 mb-4 border-b border-slate-700 pb-2 uppercase tracking-wide">Pages</h2>
          <ul className="space-y-2">
            {staticPages.map((page) => (
              <li key={page.href}>
                <Link href={page.href} className="text-slate-300 hover:text-white transition-colors text-sm">
                  {page.label}
                  <span className="ml-2 text-xs text-slate-600">{page.href}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Latest Active Trade Jobs */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-emerald-400 mb-4 border-b border-slate-700 pb-2 uppercase tracking-wide">Latest Trade Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No active jobs right now. Check back soon.</p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => {
                const area = extractCityArea(job.location)
                return (
                  <li key={job.id}>
                    <Link href={`/jobs/${job.slug ?? job.id}`} className="text-slate-300 hover:text-white transition-colors text-sm">
                      {job.title}
                      {area && <span className="ml-2 text-xs text-slate-500">— {area}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Featured Tradespeople */}
        {professionals.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-semibold text-emerald-400 mb-4 border-b border-slate-700 pb-2 uppercase tracking-wide">Featured Tradespeople</h2>
            <ul className="space-y-2">
              {professionals.map((p) => {
                const area = extractCityArea(p.location)
                return (
                  <li key={p.id}>
                    <Link href={`/professionals/${p.id}`} className="text-slate-300 hover:text-white transition-colors text-sm">
                      {p.company_name}
                      {area && <span className="ml-2 text-xs text-slate-500">— {area}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Link to machine-readable sitemap */}
        <div className="pt-6 border-t border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-slate-500">Machine-readable sitemap for search engines:</p>
          <a
            href="/sitemap.xml"
            className="text-xs font-mono text-emerald-500 hover:text-emerald-400 underline underline-offset-2 transition-colors"
          >
            /sitemap.xml
          </a>
        </div>
      </div>
    </div>
  )
}
