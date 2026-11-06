"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { signInWithAppleNative } from "@/lib/native-apple-sign-in"

// Apple's required look: black, Apple logo, "Continue with Apple".
export function AppleSignInButton({ accountType, returnUrl, disabled, onError }: {
  accountType?: string | null
  returnUrl?: string | null
  disabled?: boolean
  onError: (message: string | null) => void
}) {
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    onError(null)
    setBusy(true)
    try {
      // On success the page navigates away, so only reset after a cancel.
      if (await signInWithAppleNative({ accountType, returnUrl }) === "cancelled") setBusy(false)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Sign in with Apple failed. Please try again.")
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled || busy}
      className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-black text-white text-sm font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.37 12.68c-.03-2.67 2.18-3.95 2.28-4.01-1.24-1.82-3.18-2.07-3.87-2.1-1.65-.17-3.21.97-4.05.97-.83 0-2.12-.95-3.49-.92-1.8.03-3.45 1.04-4.38 2.65-1.87 3.24-.48 8.04 1.34 10.67.89 1.29 1.95 2.73 3.34 2.68 1.34-.05 1.85-.87 3.47-.87 1.62 0 2.08.87 3.5.84 1.44-.02 2.36-1.31 3.24-2.6 1.02-1.49 1.44-2.94 1.46-3.01-.03-.01-2.81-1.08-2.84-4.3zM13.7 4.84c.74-.9 1.24-2.14 1.1-3.38-1.06.04-2.35.71-3.11 1.6-.68.79-1.28 2.06-1.12 3.28 1.18.09 2.39-.6 3.13-1.5z" />
        </svg>
      )}
      Continue with Apple
    </button>
  )
}
