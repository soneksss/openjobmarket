"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/client"

interface AvailableNowContextValue {
  /** True once we've determined whether this account even has the toggle. */
  ready: boolean
  /** False for non-tradesperson accounts (and while loading) — consumers should render nothing. */
  isCompany: boolean
  enabled: boolean
  saving: boolean
  toggle: (next: boolean) => Promise<void>
}

const AvailableNowContext = createContext<AvailableNowContextValue | undefined>(undefined)

/**
 * Single source of truth for the "Available now" (urgent_notifications_enabled)
 * setting. Mounted once near the app root so every place that shows this
 * toggle (global header, both map screens, the company dashboard) reads and
 * writes the same state — flipping it anywhere updates it everywhere
 * instantly, no page refresh needed.
 */
export function AvailableNowProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [isCompany, setIsCompany] = useState(false)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { if (!cancelled) setReady(true); return }
      const { data: userRow } = await supabase.from("users").select("user_type").eq("id", user.id).maybeSingle()
      if (cancelled) return
      if (userRow?.user_type !== "company") { setReady(true); return }

      const { data } = await supabase
        .from("company_profiles")
        .select("id, urgent_notifications_enabled, urgent_notifications_expires_at")
        .eq("user_id", user.id)
        .maybeSingle()
      if (cancelled || !data) { setReady(true); return }

      const expiresAt = data.urgent_notifications_expires_at
      const stillActive = !!data.urgent_notifications_enabled && (!expiresAt || new Date(expiresAt) > new Date())
      setProfileId(data.id)
      setIsCompany(true)
      setEnabled(stillActive)
      setReady(true)

      // Client-side expiry guard — DB cron may not have run yet since expiry.
      if (data.urgent_notifications_enabled && !stillActive) {
        supabase.from("company_profiles").update({
          urgent_notifications_enabled: false,
          urgent_notifications_expires_at: null,
          open_for_business: false,
          availability_expires_at: null,
        }).eq("id", data.id).then(() => {})
      }
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async (next: boolean) => {
    if (!profileId) return
    setSaving(true)
    setEnabled(next)
    const expiresAt = next ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
    const { error } = await supabase
      .from("company_profiles")
      .update({
        urgent_notifications_enabled:    next,
        urgent_notifications_expires_at: expiresAt,
        open_for_business:               next,
        availability_expires_at:         expiresAt,
      })
      .eq("id", profileId)
    if (error) setEnabled(!next)
    setSaving(false)
  }, [profileId, supabase])

  return (
    <AvailableNowContext.Provider value={{ ready, isCompany, enabled, saving, toggle }}>
      {children}
    </AvailableNowContext.Provider>
  )
}

export function useAvailableNow() {
  const ctx = useContext(AvailableNowContext)
  if (!ctx) throw new Error("useAvailableNow must be used within an AvailableNowProvider")
  return ctx
}
