import { MetadataRoute } from "next"
import { createAdminClient } from "@/lib/server"

// Always render at request time — never cache a static XML file during build
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.openjobmarket.com"

  // All publicly indexable static pages
  const staticPages = [
    // High priority — core funnel
    { path: "/",         priority: 1.0, changeFrequency: "daily"   as const },
    { path: "/search",   priority: 0.9, changeFrequency: "hourly"  as const },
    { path: "/about",    priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/contact",  priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/help",     priority: 0.5, changeFrequency: "weekly"  as const },
    // Legal
    { path: "/privacy",  priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/terms",    priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/cookies",  priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/security", priority: 0.3, changeFrequency: "monthly" as const },
  ]

  const enPages: MetadataRoute.Sitemap = staticPages.map(page => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  const ptPages: MetadataRoute.Sitemap = staticPages.map(page => ({
    url: `${baseUrl}/br${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  let jobPages: MetadataRoute.Sitemap = []
  let tradespeoplePages: MetadataRoute.Sitemap = []

  try {
    const admin = createAdminClient()

    // Only open, active jobs — prevents indexing of closed/confirmed/completed listings
    const { data: jobs } = await admin
      .from("jobs")
      .select("id, slug, updated_at")
      .eq("is_active", true)
      .eq("status", "POSTED")
      .not("title", "is", null)
      .not("location", "is", null)
      .limit(10000)

    jobPages =
      jobs?.map((job) => ({
        url: `${baseUrl}/jobs/${job.slug ?? job.id}`,
        lastModified: new Date(job.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })) || []

    // Tradesperson profiles — company_profiles with real names
    const { data: tradespeople } = await admin
      .from("company_profiles")
      .select("id, updated_at")
      .not("company_name", "is", null)
      .not("company_name", "eq", "Tradesperson")
      .limit(10000)

    tradespeoplePages =
      tradespeople?.map((t) => ({
        url: `${baseUrl}/professionals/${t.id}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })) || []
  } catch (err) {
    // DB unavailable or env var missing — return static pages only so Google
    // still gets valid XML instead of an HTML error page
    console.error("[SITEMAP] DB fetch failed, returning static pages only:", err)
  }

  return [
    ...enPages,
    ...ptPages,
    ...jobPages,
    ...tradespeoplePages,
  ]
}
