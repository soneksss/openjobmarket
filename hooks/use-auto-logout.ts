"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { signOut as serverSignOut } from "@/lib/actions"

export function useAutoLogout() {
  const router = useRouter()
  // Track whether the sign-out was triggered manually (via manualLogout)
  // to avoid showing the session-expired redirect for intentional logouts
  const manualSignOutRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    // Listen for auth state changes.
    // When a refresh token is invalid, Supabase fires SIGNED_OUT after the failed refresh.
    // We clear stale localStorage tokens so the 400 error doesn't repeat on every page load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        // Remove Supabase auth keys from localStorage to prevent stale-token 400 errors
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') && key.includes('-auth-token')) {
              localStorage.removeItem(key)
            }
          })
        }
        // If this was NOT a manual logout, the session expired automatically.
        // Refresh the server component so the UI reflects the logged-out state
        // and the user can see the login button again.
        if (!manualSignOutRef.current) {
          router.refresh()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export async function manualLogout() {
  try {
    // 1. Clear client-side session (browser SDK cache + localStorage)
    const supabase = createClient()
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]).catch(() => {})

    // 2. Clear server-side HTTP-only cookie via server action
    //    Without this the middleware still sees the user as logged in after reload
    await serverSignOut().catch(() => {})

    // 3. Wipe local storage and hard-reload
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }
  } catch {
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }
  }
}