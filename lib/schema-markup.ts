/**
 * Schema Markup Utilities for SEO
 * Generates JSON-LD structured data for Google, ChatGPT, and other search engines
 */

interface JobPostingSchema {
  id: string
  title: string
  description: string
  company_name: string
  location: string
  job_type: string
  work_location: string
  salary_min?: number
  salary_max?: number
  created_at: string
  expires_at?: string
}

interface ProfessionalSchema {
  id: string
  first_name: string
  last_name: string
  title: string
  bio: string
  location: string
  skills: string[]
  experience_level: string
  profile_photo_url?: string
  average_rating?: number
  review_count?: number
}

interface LocalBusinessSchema {
  id: string
  company_name: string
  description: string
  location: string
  logo_url?: string
  website_url?: string
  average_rating?: number
  review_count?: number
}

/**
 * Generate JobPosting schema for job listings
 * Helps jobs appear in Google for Jobs and ChatGPT job searches
 */
export function generateJobPostingSchema(job: JobPostingSchema): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  const schema = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "identifier": {
      "@type": "PropertyValue",
      "name": "OpenJobMarket",
      "value": job.id,
    },
    "datePosted": job.created_at,
    ...(job.expires_at && { "validThrough": job.expires_at }),
    "employmentType": mapJobTypeToEmploymentType(job.job_type),
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.company_name,
      "sameAs": baseUrl,
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.location,
        "addressCountry": "GB",
      },
    },
    ...(job.work_location && {
      "jobLocationType": mapWorkLocationType(job.work_location),
    }),
    ...(job.salary_min &&
      job.salary_max && {
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": "GBP",
          "value": {
            "@type": "QuantitativeValue",
            "minValue": job.salary_min,
            "maxValue": job.salary_max,
            "unitText": "YEAR",
          },
        },
      }),
    "url": `${baseUrl}/jobs/${job.id}`,
  }

  return JSON.stringify(schema, null, 2)
}

/**
 * Generate Person schema for professional profiles
 * Helps profiles appear in "find [trade] near me" searches
 */
export function generateProfessionalSchema(professional: ProfessionalSchema): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Person",
    "name": `${professional.first_name} ${professional.last_name}`,
    "jobTitle": professional.title,
    "description": professional.bio,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": professional.location,
      "addressCountry": "GB",
    },
    "url": `${baseUrl}/professionals/${professional.id}`,
    ...(professional.profile_photo_url && { "image": professional.profile_photo_url }),
    "knowsAbout": professional.skills,
    ...(professional.average_rating &&
      professional.review_count && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": professional.average_rating.toString(),
          "reviewCount": professional.review_count.toString(),
          "bestRating": "5",
          "worstRating": "1",
        },
      }),
  }

  return JSON.stringify(schema, null, 2)
}

/**
 * Generate LocalBusiness schema for trade professionals
 * Better for "plumber near me" type searches
 */
export function generateLocalBusinessSchema(professional: ProfessionalSchema): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  const schema = {
    "@context": "https://schema.org/",
    "@type": "LocalBusiness",
    "name": `${professional.first_name} ${professional.last_name} - ${professional.title}`,
    "description": professional.bio,
    "image": professional.profile_photo_url || `${baseUrl}/images/default-profile.jpg`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": professional.location,
      "addressCountry": "GB",
    },
    "url": `${baseUrl}/professionals/${professional.id}`,
    ...(professional.average_rating &&
      professional.review_count && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": professional.average_rating.toString(),
          "reviewCount": professional.review_count.toString(),
          "bestRating": "5",
          "worstRating": "1",
        },
      }),
    "priceRange": mapExperienceToPriceRange(professional.experience_level),
  }

  return JSON.stringify(schema, null, 2)
}

/**
 * Generate Organization schema for company profiles
 */
export function generateOrganizationSchema(business: LocalBusinessSchema): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Organization",
    "name": business.company_name,
    "description": business.description,
    "url": business.website_url || `${baseUrl}`,
    "logo": business.logo_url || `${baseUrl}/images/logo.png`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": business.location,
      "addressCountry": "GB",
    },
    ...(business.average_rating &&
      business.review_count && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": business.average_rating.toString(),
          "reviewCount": business.review_count.toString(),
          "bestRating": "5",
          "worstRating": "1",
        },
      }),
  }

  return JSON.stringify(schema, null, 2)
}

/**
 * Generate BreadcrumbList schema for navigation
 * Helps search engines understand site structure
 */
export function generateBreadcrumbSchema(breadcrumbs: { name: string; url: string }[]): string {
  const schema = {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url,
    })),
  }

  return JSON.stringify(schema, null, 2)
}

/**
 * Generate SearchAction schema for site search
 * Enables "site:yoursite.com [query]" search in Google
 */
export function generateWebsiteSchema(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  const schema = {
    "@context": "https://schema.org/",
    "@type": "WebSite",
    "name": "OpenJobMarket",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return JSON.stringify(schema, null, 2)
}

// Helper functions

function mapJobTypeToEmploymentType(jobType: string): string {
  const mapping: Record<string, string> = {
    "full-time": "FULL_TIME",
    "part-time": "PART_TIME",
    contract: "CONTRACTOR",
    temporary: "TEMPORARY",
    internship: "INTERN",
  }
  return mapping[jobType.toLowerCase()] || "FULL_TIME"
}

function mapWorkLocationType(workLocation: string): string {
  const mapping: Record<string, string> = {
    onsite: "TELECOMMUTE",
    remote: "TELECOMMUTE",
    hybrid: "TELECOMMUTE",
  }
  return mapping[workLocation.toLowerCase()] || "TELECOMMUTE"
}

function mapExperienceToPriceRange(experienceLevel: string): string {
  const mapping: Record<string, string> = {
    entry: "£",
    junior: "££",
    mid: "££",
    senior: "£££",
    expert: "££££",
  }
  return mapping[experienceLevel.toLowerCase()] || "££"
}
