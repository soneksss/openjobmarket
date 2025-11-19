/**
 * Structured Data (JSON-LD) generators for rich search results
 * These help Google and other search engines understand your content better
 */

export interface JobPostingData {
  title: string
  description: string
  company: string
  location: string
  salary?: {
    min?: number
    max?: number
    currency: string
    frequency: string
  }
  jobType?: string
  datePosted: string
  validThrough?: string
  employmentType?: string
}

/**
 * Generate JobPosting structured data
 * https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */
export function generateJobPostingSchema(job: JobPostingData) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  const schema: any = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    identifier: {
      "@type": "PropertyValue",
      name: job.company,
      value: job.title,
    },
    datePosted: job.datePosted,
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "GB",
      },
    },
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      sameAs: baseUrl,
    },
  }

  if (job.validThrough) {
    schema.validThrough = job.validThrough
  }

  if (job.employmentType) {
    schema.employmentType = job.employmentType
  }

  if (job.salary) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary.currency || "GBP",
      value: {
        "@type": "QuantitativeValue",
        ...(job.salary.min && { minValue: job.salary.min }),
        ...(job.salary.max && { maxValue: job.salary.max }),
        unitText: job.salary.frequency || "YEAR",
      },
    }
  }

  return schema
}

export interface LocalBusinessData {
  name: string
  description: string
  type: string
  location: string
  telephone?: string
  priceRange?: string
  rating?: {
    value: number
    count: number
  }
}

/**
 * Generate LocalBusiness structured data for tradespeople/professionals
 * https://developers.google.com/search/docs/appearance/structured-data/local-business
 */
export function generateLocalBusinessSchema(business: LocalBusinessData) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: business.location,
      addressCountry: "GB",
    },
  }

  if (business.telephone) {
    schema.telephone = business.telephone
  }

  if (business.priceRange) {
    schema.priceRange = business.priceRange
  }

  if (business.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: business.rating.value,
      reviewCount: business.rating.count,
    }
  }

  return schema
}

/**
 * Generate Organization structured data for the website
 */
export function generateOrganizationSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OpenJobMarket",
    url: baseUrl,
    logo: `${baseUrl}/Logo.png`,
    description: "Find jobs and professionals near you. Interactive map-based job search and professional directory for the UK.",
    sameAs: [
      // Add social media URLs here when available
      // "https://www.facebook.com/openjobmarket",
      // "https://twitter.com/openjobmarket",
      // "https://www.linkedin.com/company/openjobmarket",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      availableLanguage: "English",
    },
  }
}

/**
 * Generate WebSite structured data with search action
 */
export function generateWebSiteSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OpenJobMarket",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

/**
 * Generate BreadcrumbList structured data for navigation
 */
export function generateBreadcrumbSchema(breadcrumbs: { name: string; url: string }[]) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${baseUrl}${crumb.url}`,
    })),
  }
}

/**
 * Helper to render structured data as script tag
 */
export function StructuredDataScript({ data }: { data: any }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
