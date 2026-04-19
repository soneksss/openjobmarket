"use client"

/**
 * LandingPageV2 — placeholder for the next homepage redesign.
 *
 * Currently renders LandingPageV1 with a visible dev badge so you can verify
 * the layout switch works before the real V2 design is ready.
 *
 * To ship the real V2:
 *   1. Replace the body of this component with the new design.
 *   2. Set layout_version = 'v2' in admin_settings (DB or admin panel).
 *   3. All users see the new layout instantly — no app store update needed.
 */

import { LandingPage } from '@/components/landing-page'

export function LandingPageV2(props: any) {
  return (
    <>
      {/* Remove this banner once the real V2 design is implemented */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-400 text-black text-xs text-center py-1 font-mono">
          Layout V2 (placeholder) — replace contents of components/landing-page-v2.tsx
        </div>
      )}
      <LandingPage {...props} />
    </>
  )
}
