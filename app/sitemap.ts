import { MetadataRoute } from "next"
import { createClient } from "@/lib/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
  const supabase = await createClient()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/professionals`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ]

  // Fetch all active job postings
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, updated_at")
    .eq("is_active", true)
    .limit(1000)

  const jobPages: MetadataRoute.Sitemap =
    jobs?.map((job) => ({
      url: `${baseUrl}/jobs/${job.id}`,
      lastModified: new Date(job.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) || []

  // Fetch all professional profiles
  const { data: professionals } = await supabase
    .from("professional_profiles")
    .select("id, updated_at")
    .limit(1000)

  const professionalPages: MetadataRoute.Sitemap =
    professionals?.map((prof) => ({
      url: `${baseUrl}/professionals/${prof.id}`,
      lastModified: prof.updated_at ? new Date(prof.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })) || []

  // Generate location-based pages for common searches
  const locations = [
    "london",
    "manchester",
    "birmingham",
    "leeds",
    "glasgow",
    "liverpool",
    "edinburgh",
    "bristol",
    "cardiff",
    "sheffield",
  ]

  const trades = ["plumber", "electrician", "carpenter", "builder", "painter", "roofer"]

  const locationPages: MetadataRoute.Sitemap = locations.flatMap((location) =>
    trades.map((trade) => ({
      url: `${baseUrl}/map?trade=${trade}&location=${location}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.5,
    }))
  )

  return [...staticPages, ...jobPages, ...professionalPages, ...locationPages]
}
