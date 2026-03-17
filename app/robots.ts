import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/jobs/',
          '/professionals/',
          '/search',
          '/about',
          '/contact',
          '/help',
          '/privacy',
          '/terms',
          '/cookies',
          '/security',
          '/br/',
        ],
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
          '/account/',
          '/notifications/',
          '/cv/',
          '/jobs/*/edit',
          '/jobs/*/applications',
          '/jobs/*/extend',
          '/jobs/*/select',
          '/_next/',
          '/test-i18n/',
          '/demo/',
          '/free-plan-demo/',
        ],
      },
      // Allow major AI crawlers full access to public content
      { userAgent: 'GPTBot',       allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'Claude-Web',   allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
    ],
    sitemap: 'https://www.openjobmarket.com/sitemap.xml',
  }
}
