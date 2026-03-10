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

  // Fetch all active job postings
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, updated_at")
    .eq("is_active", true)
    .limit(5000)

  const jobPages: MetadataRoute.Sitemap =
    jobs?.map((job) => ({
      url: `${baseUrl}/jobs/${job.id}`,
      lastModified: new Date(job.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) || []

  // Fetch all tradesperson (professional) profiles
  const { data: professionals } = await supabase
    .from("professional_profiles")
    .select("id, updated_at")
    .limit(5000)

  const professionalPages: MetadataRoute.Sitemap =
    professionals?.map((prof) => ({
      url: `${baseUrl}/professionals/${prof.id}`,
      lastModified: prof.updated_at ? new Date(prof.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })) || []

  return [
    ...enPages,
    ...ptPages,
    ...jobPages,
    ...professionalPages,
  ]
}
