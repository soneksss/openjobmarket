import { Metadata } from 'next'

export interface SEOConfig {
  title: string
  description: string
  path: string
  locale?: 'en' | 'pt-BR'
  noindex?: boolean
  image?: string
  type?: 'website' | 'article'
}

// Always use www — canonical and OG URLs must be consistent with the production domain
const baseUrl = 'https://www.openjobmarket.com'

/**
 * Generate consistent SEO metadata for pages.
 * /br/ locale is currently disabled (redirects to /) so hreflang alternates
 * are omitted — pointing them to redirect targets confuses Googlebot.
 */
export function generateSEO(config: SEOConfig): Metadata {
  const {
    title,
    description,
    path,
    noindex = false,
    image = `${baseUrl}/Logo.png`,
    type = 'website',
  } = config

  const fullTitle = title.includes('Open Job Market')
    ? title
    : `${title} | Open Job Market`

  const canonicalUrl = `${baseUrl}${path}`

  const metadata: Metadata = {
    title: fullTitle,
    description,
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true },
        },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: 'Open Job Market',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      locale: 'en_GB',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  }

  return metadata
}

/**
 * Generate metadata for job listing pages
 */
export function generateJobSEO(job: {
  title: string
  company: string
  location?: string
  description: string
  id: string
}): Metadata {
  const title = `${job.title} at ${job.company}${job.location ? ` - ${job.location}` : ''}`
  const description = job.description.slice(0, 160)

  return generateSEO({
    title,
    description,
    path: `/jobs/${job.id}`,
    type: 'article',
  })
}

/**
 * Generate metadata for professional profile pages
 */
export function generateProfessionalSEO(profile: {
  firstName: string
  lastName: string
  title?: string
  bio?: string
  id: string
}): Metadata {
  const name = `${profile.firstName} ${profile.lastName}`
  const title = profile.title
    ? `${name} - ${profile.title}`
    : `${name} - Professional Profile`
  const description = profile.bio?.slice(0, 160) || `View ${name}'s professional profile on OpenJobMarket`

  return generateSEO({
    title,
    description,
    path: `/professionals/${profile.id}`,
    type: 'article',
  })
}
