import { MetadataRoute } from "next"
import { createClient } from "@/lib/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.openjobmarket.com"
  const supabase = await createClient()

  // Public-facing static pages only (no auth/dashboard/private routes)
  const publicPages = [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/jobs", priority: 0.9, changeFrequency: "hourly" as const },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/professionals", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/privacy", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.4, changeFrequency: "monthly" as const },
  ]

  const enPages: MetadataRoute.Sitemap = publicPages.map(page => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  const ptPages: MetadataRoute.Sitemap = publicPages.map(page => ({
    url: `${baseUrl}/br${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  // Fetch all real active job postings (must have title and location — excludes test/demo rows)
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, updated_at")
    .eq("is_active", true)
    .not("title", "is", null)
    .not("location", "is", null)
    .limit(5000)

  const jobPages: MetadataRoute.Sitemap =
    jobs?.map((job) => ({
      url: `${baseUrl}/jobs/${job.id}`,
      lastModified: new Date(job.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) || []

  // Fetch real tradesperson profiles from company_profiles (post-2-role migration)
  const { data: tradespeople } = await supabase
    .from("company_profiles")
    .select("id, updated_at")
    .not("company_name", "is", null)
    .not("company_name", "eq", "Tradesperson")
    .limit(5000)

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
