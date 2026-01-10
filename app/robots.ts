import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://openjobmarket.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/*',
          '/admin/*',
          '/api/*',
          '/auth/*',
          '/onboarding/*',
          '/profile/*',
          '/billing/*',
          '/messages/*',
          '/applications/*',
          '/tasks/*',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard/*',
          '/admin/*',
          '/api/*',
          '/auth/*',
          '/onboarding/*',
          '/profile/*',
          '/billing/*',
          '/messages/*',
          '/applications/*',
          '/tasks/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
