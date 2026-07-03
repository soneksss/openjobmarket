"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/client"
import { signOut } from "@/lib/actions"

export default function SignOutPage() {
  useEffect(() => {
    const doSignOut = async () => {
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
        await signOut()
      } catch {
        // ignore — proceed to redirect regardless
      }
      window.location.replace("/home")
    }
    doSignOut()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Signing out…</p>
    </div>
  )
}
