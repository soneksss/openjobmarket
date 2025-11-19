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
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contractors`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tasks`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/auth/sign-up`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/jobs/new`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/jobs/vacancy/new`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/homeowner/jobs/new`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/cv/builder`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/billing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy-centre`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
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

  // Generate location-specific pages for major UK cities
  const cities = [
    "london", "manchester", "birmingham", "leeds", "glasgow",
    "liverpool", "edinburgh", "bristol", "cardiff", "sheffield",
    "newcastle", "nottingham", "southampton", "portsmouth", "leicester"
  ]

  const cityPages: MetadataRoute.Sitemap = cities.flatMap(city => [
    {
      url: `${baseUrl}/jobs?location=${encodeURIComponent(city)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/professionals?location=${encodeURIComponent(city)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }
  ])

  // Generate job type pages
  const jobTypes = [
    "remote", "full-time", "part-time", "contract", "freelance",
    "temporary", "internship", "apprenticeship"
  ]

  const jobTypePages: MetadataRoute.Sitemap = jobTypes.map(type => ({
    url: `${baseUrl}/jobs?type=${encodeURIComponent(type)}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }))

  // Generate trade category pages
  const trades = [
    "plumber", "electrician", "carpenter", "builder", "painter",
    "decorator", "roofer", "bricklayer", "plasterer", "tiler"
  ]

  const tradePages: MetadataRoute.Sitemap = trades.map(trade => ({
    url: `${baseUrl}/contractors?trade=${encodeURIComponent(trade)}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }))

  return [
    ...staticPages,
    ...jobPages,
    ...professionalPages,
    ...cityPages,
    ...jobTypePages,
    ...tradePages
  ]
}
