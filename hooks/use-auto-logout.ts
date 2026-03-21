"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/client"
import { signOut as serverSignOut } from "@/lib/actions"

export function useAutoLogout() {
  useEffect(() => {
    // DISABLED: This hook was causing users to be logged out during Next.js navigation
    // The beforeunload/unload events can fire during client-side navigation in Next.js,
    // not just when closing the browser tab. This created an extremely poor UX.

    // If auto-logout on browser close is needed in the future, consider:
    // 1. Using window.onbeforeunload with a flag to differentiate navigation vs close
    // 2. Using sessionStorage to track navigation state
    // 3. Using a more reliable browser close detection method

    console.log('[AUTO-LOGOUT] Hook is currently disabled to prevent accidental logouts')

    return () => {
      // No cleanup needed
    }
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