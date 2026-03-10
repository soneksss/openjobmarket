import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/auth/',
          '/onboarding/',
          '/profile/',
          '/billing/',
          '/messages/',
          '/applications/',
          '/tasks/',
          '/account/',
          '/notifications/',
        ],
      },
    ],
    sitemap: 'https://www.openjobmarket.com/sitemap.xml',
  }
}
