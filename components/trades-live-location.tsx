"use client"

import { useEffect, useRef } from "react"
import { useAvailableNow } from "@/contexts/available-now-context"
import { getPosition } from "@/lib/native-geolocation"

/**
 * Live GPS sharing, driven ENTIRELY by the "Available now" toggle.
 *
 *  - Available now ON  → send the device's current position to
 *    /api/tradesperson/live-location every ~20s. The row is what the public
 *    map ("green van") and job matching read while it stays fresh.
 *  - Available now OFF (manual toggle OR the 9:00 AM auto-reset, which the
 *    context reflects) → stop the interval and deactivate the row.
 *
 * NEVER touches company_profiles.latitude/longitude — that is the permanent
 * business location. Renders nothing.
 */
const UPDATE_MS = 20_000

export function TradesLiveLocation() {
  const { isCompany, enabled } = useAvailableNow()

  const inFlight = useRef(false)
  const stopped  = useRef(false) // server told us Available now is off — stop until re-enabled

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isCompany || !enabled) return

    stopped.current = false
    let intervalId: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    const push = async () => {
      if (cancelled || stopped.current || inFlight.current) return
      inFlight.current = true
      try {
        const { latitude, longitude } = await getPosition({
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 15_000,
        })
        if (cancelled || stopped.current) return
        if (!isFinite(latitude) || !isFinite(longitude)) return // never send junk
        const res = await fetch("/api/tradesperson/live-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: latitude, lng: longitude }),
        })
        const body = await res.json().catch(() => ({}))
        // Server says Available now is no longer active (e.g. 9:00 AM reset) —
        // stop sending until the toggle is turned on again.
        if (body?.active === false) {
          stopped.current = true
          if (intervalId) { clearInterval(intervalId); intervalId = null }
        }
      } catch (err) {
        // Permission denied → stop retrying (no repeated OS prompts). Timeout /
        // temporarily-unavailable → keep the interval, try again next tick and
        // leave the last good position in place.
        const msg = err instanceof Error ? err.message : ""
        if (msg === "Location permission denied" || (err as any)?.code === 1) {
          stopped.current = true
          if (intervalId) { clearInterval(intervalId); intervalId = null }
        }
      } finally {
        inFlight.current = false
      }
    }

    push() // immediate first fix
    intervalId = setInterval(push, UPDATE_MS)

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
      // Deactivate the live row on the way out (toggle off, sign out, unmount).
      // keepalive so it still fires if this is part of a navigation.
      if (!stopped.current) {
        fetch("/api/tradesperson/live-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deactivate: true }),
          keepalive: true,
        }).catch(() => {})
      }
    }
  }, [isCompany, enabled])

  return null
}
