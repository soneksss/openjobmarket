import { MetadataRoute } from "next"
import { createClient } from "@/lib/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
  const supabase = await createClient()

  // Define public pages (excluding auth, dashboard, admin, api)
  const publicPages = [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/jobs", priority: 0.9, changeFrequency: "hourly" as const },
    { path: "/search", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/help", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/useful-info", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/companies", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/contractors", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/homeowners", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/professionals", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/reviews", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/security", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/cookies", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/privacy-centre", priority: 0.4, changeFrequency: "monthly" as const },
  ]

  // Generate English pages
  const enPages: MetadataRoute.Sitemap = publicPages.map(page => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  // Generate Portuguese pages (all public pages have /br equivalents)
  const ptPages: MetadataRoute.Sitemap = publicPages.map(page => ({
    url: `${baseUrl}/br${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  const staticPages: MetadataRoute.Sitemap = [...enPages, ...ptPages]

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
      url: `${baseUrl}/?tab=talents&location=${encodeURIComponent(city)}`,
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
    url: `${baseUrl}/?tab=traders&trade=${encodeURIComponent(trade)}`,
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
