import { MetadataRoute } from "next"
import { createAdminClient } from "@/lib/server"

// Regenerate once per hour — sitemap does not need to be fresh on every request
export const revalidate = 3600

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
  // /br/* locale URLs are permanently redirected to / — exclude from sitemap
  // so Google doesn't crawl redirect chains

  let jobPages: MetadataRoute.Sitemap = []
  let tradespeoplePages: MetadataRoute.Sitemap = []

  try {
    const admin = createAdminClient()

    // Fetch both in parallel — each has a 5 s soft deadline via safeFetch.
    // Limit to 3 000 rows each so the combined response stays well under
    // Vercel's 10 s serverless timeout.
    const [jobsResult, tradespeopleResult] = await Promise.allSettled([
      admin
        .from("jobs")
        .select("id, slug, updated_at")
        .eq("is_active", true)
        .eq("status", "POSTED")
        .not("title", "is", null)
        .not("location", "is", null)
        .limit(3000),

      admin
        .from("company_profiles")
        .select("id, updated_at")
        .not("company_name", "is", null)
        .not("company_name", "eq", "Tradesperson")
        .limit(3000),
    ])

    if (jobsResult.status === "fulfilled") {
      jobPages =
        jobsResult.value.data?.map((job) => ({
          url: `${baseUrl}/jobs/${job.slug ?? job.id}`,
          lastModified: new Date(job.updated_at),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })) || []
    } else {
      console.error("[SITEMAP] Jobs query failed:", jobsResult.reason)
    }

    if (tradespeopleResult.status === "fulfilled") {
      tradespeoplePages =
        tradespeopleResult.value.data?.map((t) => ({
          url: `${baseUrl}/professionals/${t.id}`,
          lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        })) || []
    } else {
      console.error("[SITEMAP] Tradespeople query failed:", tradespeopleResult.reason)
    }
  } catch (err) {
    // DB unavailable or env var missing — return static pages only so Google
    // still gets valid XML instead of an HTML error page
    console.error("[SITEMAP] DB fetch failed, returning static pages only:", err)
  }

  return [
    ...enPages,
    ...jobPages,
    ...tradespeoplePages,
  ]
}
