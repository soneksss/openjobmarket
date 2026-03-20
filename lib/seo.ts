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

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://openjobmarket.com'

/**
 * Generate consistent SEO metadata for pages with i18n and hreflang support
 */
export function generateSEO(config: SEOConfig): Metadata {
  const {
    title,
    description,
    path,
    locale = 'en',
    noindex = false,
    image = `${baseUrl}/Logo.png`,
    type = 'website',
  } = config

  const fullTitle = title.includes('OpenJobMarket')
    ? title
    : `${title} | OpenJobMarket`

  const canonicalPath = locale === 'pt-BR' ? `/br${path}` : path
  const canonicalUrl = `${baseUrl}${canonicalPath}`

  // Generate alternate language URLs
  const enUrl = `${baseUrl}${path}`
  const ptUrl = `${baseUrl}/br${path}`

  const metadata: Metadata = {
    title: fullTitle,
    description,
    robots: noindex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
          },
        },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: enUrl,
        'pt-BR': ptUrl,
        'x-default': enUrl,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: 'OpenJobMarket',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale === 'pt-BR' ? 'pt_BR' : 'en_GB',
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
