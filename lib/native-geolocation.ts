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
  // Native plugins (and some browsers) don't reliably honor the `timeout`
  // option internally, which leaves callers hanging indefinitely. Race
  // against our own timer so this always settles in bounded time.
  const timeoutMs = options.timeout ?? 15000
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Location request timed out")), timeoutMs)
  })
  try {
    return await Promise.race([getPositionRaw(options), timeout])
  } finally {
    clearTimeout(timer!)
  }
}

// Turns a getPosition() rejection into a short, user-facing message.
export function describeGeoError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "Location permission denied") return "Location permission denied — enable it in your device settings."
    if (err.message === "Location request timed out") return "Couldn't get your location — please try again."
    if (err.message === "Geolocation not supported") return "Your browser doesn't support geolocation."
  }
  switch ((err as any)?.code) {
    case 1: return "Location permission denied — enable it in your device settings."
    case 2: return "Your location is currently unavailable."
    case 3: return "Couldn't get your location — please try again."
    default: return "Couldn't get your location."
  }
}

async function getPositionRaw(options: GeoOptions): Promise<GeoCoords> {
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
      // Without this, the native plugin defaults maximumAge to 0 — every call
      // forces a brand-new GPS/network fix from scratch, even when the caller
      // said a position up to 5 minutes old is fine. That's what made the
      // second "Locate me" tap slow enough to time out.
      maximumAge: options.maximumAge,
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
