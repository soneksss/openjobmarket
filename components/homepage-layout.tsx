"use client"

import dynamic from 'next/dynamic'

/**
 * HomepageLayout — server-controlled layout switcher.
 *
 * The `version` prop comes from adminSettings.layoutVersion (fetched server-side
 * from the DB via getAdminSettings()). Changing the DB value switches all users
 * to the new layout instantly — no code deploy needed.
 *
 * v1 = current LandingPage (production)
 * v2 = placeholder until a real redesign ships
 *
 * Both variants are dynamically imported so they are code-split and the unused
 * variant is never shipped to the client.
 */

const LayoutV1 = dynamic(
  () => import('@/components/landing-page').then(m => ({ default: m.LandingPage }))
)

const LayoutV2 = dynamic(
  () => import('@/components/landing-page-v2').then(m => ({ default: m.LandingPageV2 }))
)

interface HomepageLayoutProps {
  version: 'v1' | 'v2'
  [key: string]: any
}

export function HomepageLayout({ version, ...props }: HomepageLayoutProps) {
  if (version === 'v2') {
    return <LayoutV2 {...props} />
  }
  return <LayoutV1 {...props} />
}
