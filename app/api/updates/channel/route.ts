import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/updates/channel
 *
 * Capgo OTA channel manifest endpoint.
 * @capgo/capacitor-updater posts the currently installed bundle version here
 * on every app foreground. The server replies with:
 *   - { version }        → no update available (same or unknown version)
 *   - { version, url }  → a new bundle is available at this URL
 *
 * How to trigger an OTA push:
 *   1. Build a new native shell bundle (zip of the web assets).
 *   2. Upload it to /public/bundles/<version>.zip (or a CDN).
 *   3. Bump APP_BUNDLE_VERSION env var on Vercel (e.g. "1.0.1").
 *   4. Redeploy. The next time a device foregrounds, it downloads the bundle.
 *
 * Note: Because the app uses server.url (live site), the web UI always updates
 * automatically. OTA is only needed for native-shell changes (new plugins,
 * AndroidManifest/Info.plist changes, etc.).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const installedVersion: string = body.version ?? '0.0.0'

  const latestBundleVersion = process.env.APP_BUNDLE_VERSION ?? installedVersion
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.openjobmarket.com'

  // No update available — return the same version so the updater does nothing
  if (installedVersion === latestBundleVersion) {
    return NextResponse.json({ version: installedVersion })
  }

  // New bundle available — return the download URL
  return NextResponse.json({
    version: latestBundleVersion,
    url: `${siteUrl}/bundles/${latestBundleVersion}.zip`,
  })
}
