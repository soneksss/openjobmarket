"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/client"

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
  console.log('[LOGOUT] Starting manual logout...')

  try {
    const supabase = createClient()

    // Create timeout for sign out (3 seconds max)
    const signOutPromise = supabase.auth.signOut()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sign out timeout')), 3000)
    )

    try {
      // Try to sign out with timeout
      await Promise.race([signOutPromise, timeoutPromise])
      console.log('[LOGOUT] Sign out successful')
    } catch (error) {
      console.warn('[LOGOUT] Sign out timed out or failed, continuing with redirect:', error)
    }

    // Clear all storage (always do this)
    if (typeof window !== 'undefined') {
      console.log('[LOGOUT] Clearing storage...')
      localStorage.clear()
      sessionStorage.clear()

      // Force reload to clear any cached data
      console.log('[LOGOUT] Redirecting to /')
      window.location.href = '/'
    }
  } catch (error) {
    console.error("[LOGOUT] Error during manual logout:", error)
    // Force redirect even if logout fails
    if (typeof window !== 'undefined') {
      console.log('[LOGOUT] Forcing redirect despite error')
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }
  }
}