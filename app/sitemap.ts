import { MetadataRoute } from "next"
import { createAdminClient } from "@/lib/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.openjobmarket.com"
  const admin = createAdminClient()

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

  // Only open, active jobs — prevents indexing of closed/confirmed/completed listings
  const { data: jobs } = await admin
    .from("jobs")
    .select("id, slug, updated_at")
    .eq("is_active", true)
    .eq("status", "POSTED")
    .not("title", "is", null)
    .not("location", "is", null)
    .limit(10000)

  const jobPages: MetadataRoute.Sitemap =
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

  const tradespeoplePages: MetadataRoute.Sitemap =
    tradespeople?.map((t) => ({
      url: `${baseUrl}/professionals/${t.id}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })) || []

  return [
    ...enPages,
    ...ptPages,
    ...jobPages,
    ...tradespeoplePages,
  ]
}
