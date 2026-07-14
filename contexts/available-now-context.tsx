"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/client"
import { nextNineAM } from "@/lib/availability"

interface AvailableNowContextValue {
  /** True once we've determined whether this account even has the toggle. */
  ready: boolean
  /** False for non-tradesperson accounts (and while loading) — consumers should render nothing. */
  isCompany: boolean
  enabled: boolean
  saving: boolean
  /** When `enabled`, the fixed daily-reset time (ISO string) — for the countdown display. */
  expiresAt: string | null
  toggle: (next: boolean) => Promise<void>
}

const AvailableNowContext = createContext<AvailableNowContextValue | undefined>(undefined)

/**
 * Single source of truth for the "Available now" (urgent_notifications_enabled)
 * setting. Mounted once near the app root so every place that shows this
 * toggle (global header, both map screens, the company dashboard) reads and
 * writes the same state — flipping it anywhere updates it everywhere
 * instantly, no page refresh needed.
 *
 * Resets at a fixed daily time (9am, see lib/availability.ts) rather than a
 * rolling 24h window — toggling off/on doesn't push the reset further out.
 */
export function AvailableNowProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isCompany, setIsCompany] = useState(false)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Runs whenever we have a resolved user id — both on initial load AND on
    // a fresh client-side login (see onAuthStateChange below).
    const resolveForUser = async (userId: string) => {
      const { data: userRow } = await supabase.from("users").select("user_type").eq("id", userId).maybeSingle()
      if (cancelled) return
      if (userRow?.user_type !== "company") { setReady(true); return }

      const { data } = await supabase
        .from("company_profiles")
        .select("id, urgent_notifications_enabled, urgent_notifications_expires_at")
        .eq("user_id", userId)
        .maybeSingle()
      if (cancelled || !data) { setReady(true); return }

      const expiry = data.urgent_notifications_expires_at
      const stillActive = !!data.urgent_notifications_enabled && (!expiry || new Date(expiry) > new Date())
      setProfileId(data.id)
      setIsCompany(true)
      setEnabled(stillActive)
      setExpiresAt(stillActive ? expiry : null)
      setReady(true)

      // Client-side expiry guard — DB cron may not have run yet since expiry.
      // Deliberately NOT nulling urgent_notifications_expires_at / availability_expires_at
      // here (mirrors expire-availability/route.ts) — daily-availability-prompt needs
      // that now-past timestamp to find who to send the confirmation push to. Nulling
      // it here would silently remove this trader from that pipeline the moment they
      // open the app, before the cron ever gets a chance to prompt them.
      if (data.urgent_notifications_enabled && !stillActive) {
        supabase.from("company_profiles").update({
          urgent_notifications_enabled: false,
          open_for_business: false,
        }).eq("id", data.id).then(() => {})
      }
    }

    // onAuthStateChange (not a one-shot getUser() call) so this reacts to a
    // login that happens AFTER this provider mounted. It's mounted once at
    // the root layout and never remounts on the login form's router.push()
    // redirect, so a one-shot check here would permanently freeze isCompany
    // at whatever it was on the login page (false) — hiding the toggle until
    // a hard refresh. INITIAL_SESSION covers first load, SIGNED_IN covers a
    // fresh login in the same tab. Same fix already used in header.tsx.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session?.user) {
        resolveForUser(session.user.id)
      } else if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session?.user)) {
        setProfileId(null)
        setIsCompany(false)
        setEnabled(false)
        setExpiresAt(null)
        setReady(true)
      }
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async (next: boolean) => {
    if (!profileId) return
    setSaving(true)
    setEnabled(next)
    const expiry = next ? nextNineAM().toISOString() : null
    setExpiresAt(expiry)
    const { error } = await supabase
      .from("company_profiles")
      .update({
        urgent_notifications_enabled:    next,
        urgent_notifications_expires_at: expiry,
        open_for_business:               next,
        availability_expires_at:         expiry,
      })
      .eq("id", profileId)
    if (error) { setEnabled(!next); setExpiresAt(null) }
    setSaving(false)
  }, [profileId, supabase])

  return (
    <AvailableNowContext.Provider value={{ ready, isCompany, enabled, saving, expiresAt, toggle }}>
      {children}
    </AvailableNowContext.Provider>
  )
}

export function useAvailableNow() {
  const ctx = useContext(AvailableNowContext)
  if (!ctx) throw new Error("useAvailableNow must be used within an AvailableNowProvider")
  return ctx
}
