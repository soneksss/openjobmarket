// Store links for the native apps — one place, used by the install banners,
// the footer and the app-version gate.

export const ANDROID_APP_ID = "com.openjobmarket.app"
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_APP_ID}`

export const IOS_APP_ID = "6809015668"
export const APP_STORE_URL = `https://apps.apple.com/app/id${IOS_APP_ID}`

/**
 * Server only: is the iPhone app on the public App Store yet? (TestFlight
 * builds aren't.) Apple's lookup returns no results until it is. Cached for a
 * day, so this costs one request per day, not one per page.
 */
export async function isIosAppLive(): Promise<boolean> {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${IOS_APP_ID}&country=gb`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(3000),
    })
    const data = await res.json()
    return (data?.resultCount ?? 0) > 0
  } catch {
    return false
  }
}
