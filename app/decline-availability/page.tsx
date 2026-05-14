"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { XCircle, Loader2 } from "lucide-react"

export default function DeclineAvailabilityPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "done">("loading")

  useEffect(() => {
    fetch("/api/tradesperson/decline-availability", { method: "POST" })
      .finally(() => {
        setStatus("done")
        setTimeout(() => router.push("/dashboard/company"), 2000)
      })
  }, [router])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center max-w-sm w-full">
        {status === "loading" ? (
          <>
            <Loader2 className="h-10 w-10 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Updating your status…</p>
          </>
        ) : (
          <>
            <XCircle className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-1">You're offline</p>
            <p className="text-slate-400 text-sm">
              You won't receive availability reminders again until you turn availability back on from your dashboard.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
