import { Metadata } from "next"
import { primaryKeywords, longTailKeywords } from "./seo-keywords"

interface SEOMetadataOptions {
  title: string
  description: string
  keywords?: string[]
  path?: string
  image?: string
}

/**
 * Generate comprehensive SEO metadata for pages
 */
export function generateSEOMetadata(options: SEOMetadataOptions): Metadata {
  const {
    title,
    description,
    keywords = [],
    path = "",
    image = "/og-image.jpg"
  } = options

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
  const url = `${baseUrl}${path}`

  // Combine provided keywords with primary SEO keywords
  const allKeywords = [
    ...keywords,
    ...primaryKeywords.slice(0, 20), // Include top 20 primary keywords
    "OpenJobMarket",
    "job board",
    "employment",
  ]

  return {
    title,
    description,
    keywords: allKeywords,
    openGraph: {
      title,
      description,
      url,
      siteName: "OpenJobMarket",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_GB",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  }
}

/**
 * Generate metadata for job listing pages
 */
export function generateJobMetadata(job: {
  title: string
  location: string
  company: string
  salary?: string
  description?: string
}) {
  const keywords = [
    job.title.toLowerCase(),
    `${job.title.toLowerCase()} jobs`,
    `${job.title.toLowerCase()} in ${job.location}`,
    `jobs in ${job.location}`,
    job.company,
    "job vacancy",
    "employment",
    "hiring",
  ]

  return generateSEOMetadata({
    title: `${job.title} at ${job.company} - ${job.location} | OpenJobMarket`,
    description: job.description
      ? `${job.description.substring(0, 150)}...`
      : `Apply for ${job.title} position at ${job.company} in ${job.location}. ${job.salary ? `Salary: ${job.salary}.` : ""} Find your next career opportunity on OpenJobMarket.`,
    keywords,
  })
}

/**
 * Generate metadata for professional/tradesperson profile pages
 */
export function generateProfileMetadata(profile: {
  name: string
  title: string
  location: string
  skills?: string[]
}) {
  const keywords = [
    profile.title.toLowerCase(),
    `${profile.title.toLowerCase()} ${profile.location}`,
    `find ${profile.title.toLowerCase()}`,
    `hire ${profile.title.toLowerCase()}`,
    ...(profile.skills || []),
    profile.location,
  ]

  return generateSEOMetadata({
    title: `${profile.name} - ${profile.title} in ${profile.location} | OpenJobMarket`,
    description: `Connect with ${profile.name}, a professional ${profile.title} in ${profile.location}. ${profile.skills?.length ? `Skills: ${profile.skills.join(", ")}.` : ""} Find verified professionals on OpenJobMarket.`,
    keywords,
  })
}

/**
 * Generate metadata for search result pages
 */
export function generateSearchMetadata(params: {
  query?: string
  location?: string
  jobType?: string
  remote?: boolean
}) {
  const { query, location, jobType, remote } = params

  let title = "Search Jobs"
  let description = "Find your perfect job"
  const keywords: string[] = ["job search", "find jobs"]

  if (query) {
    title = `${query} Jobs`
    description = `Browse ${query} job opportunities`
    keywords.push(query, `${query} jobs`, `${query} careers`)
  }

  if (location) {
    title += ` in ${location}`
    description += ` in ${location}`
    keywords.push(`jobs in ${location}`, `${location} employment`)
  }

  if (jobType) {
    title += ` - ${jobType}`
    keywords.push(`${jobType} jobs`)
  }

  if (remote) {
    title += " - Remote"
    description += ". Work from home opportunities available."
    keywords.push("remote jobs", "work from home", "remote work")
  }

  title += " | OpenJobMarket"
  description += ". Search thousands of job listings on our interactive map."

  return generateSEOMetadata({ title, description, keywords })
}
