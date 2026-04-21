"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/client"

/**
 * Silently updates the tradesperson's lat/lng in company_profiles once per session.
 * Called on app open (web) and on every foreground resume (native app).
 * No-op for homeowners, unauthenticated users, or denied geolocation.
 */
export function useTradesLocationSync() {
  useEffect(() => {
    syncLocation()
  }, [])
}

export async function syncLocation() {
  if (typeof window === "undefined" || !navigator.geolocation) return

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "company") return

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        await supabase
          .from("company_profiles")
          .update({ latitude: lat, longitude: lng })
          .eq("user_id", user.id)
      },
      () => {}, // permission denied or unavailable — silent fail
      { timeout: 8000, maximumAge: 5 * 60 * 1000 } // accept cached position up to 5 min old
    )
  } catch {
    // network error or auth failure — never block the UI
  }
}
