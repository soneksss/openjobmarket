/**
 * Platform-aware geolocation wrapper.
 *
 * On Android/iOS (Capacitor native): uses @capacitor/geolocation which
 * properly triggers the OS permission dialog before calling the hardware.
 * Without this, navigator.geolocation silently fails in a WebView because
 * the OS has never been asked for location access.
 *
 * On web: delegates to the standard navigator.geolocation API.
 */

export interface GeoCoords {
  latitude: number
  longitude: number
}

export interface GeoOptions {
  timeout?: number
  maximumAge?: number
  enableHighAccuracy?: boolean
}

function isNativePlatform(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.()
}

export async function getPosition(options: GeoOptions = {}): Promise<GeoCoords> {
  if (isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation")

    // Request OS permission if not already granted
    const perms = await Geolocation.checkPermissions()
    if (perms.location !== "granted") {
      const req = await Geolocation.requestPermissions()
      if (req.location === "denied") {
        throw new Error("Location permission denied")
      }
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? false,
      timeout: options.timeout,
    })
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
  }

  // Web path
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      reject,
      options
    )
  })
}
