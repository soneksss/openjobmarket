"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/client"

/**
 * Silently updates the tradesperson's lat/lng in company_profiles once per session.
 * Called on app open (web) and on cold start (native app via CapacitorInit).
 * No-op for homeowners, unauthenticated users, or denied/prompt geolocation.
 *
 * Physical GPS always takes priority — manual coordinates are overwritten.
 */
export function useTradesLocationSync() {
  useEffect(() => {
    syncLocation()
  }, [])
}

export async function syncLocation() {
  if (typeof window === "undefined" || !navigator.geolocation) return

  try {
    // Skip entirely if permission is not already granted — no prompts, no retries
    if (navigator.permissions) {
      const perm = await navigator.permissions.query({ name: "geolocation" })
      if (perm.state !== "granted") return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "company") return

    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await supabase
            .from("company_profiles")
            .update({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
            .eq("user_id", user.id)
        },
        () => {},  // denied or unavailable — silent fail
        { timeout: 8000, maximumAge: 5 * 60 * 1000 }
      )
    } catch {
      // getCurrentPosition unavailable (e.g. WebView destroyed) — silent fail
    }
  } catch {
    // Network error or auth failure — never block the UI
  }
}
