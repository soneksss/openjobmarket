"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function ConfirmAvailabilityPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    fetch("/api/tradesperson/confirm-availability", { method: "POST" })
      .then((r) => {
        if (r.ok) {
          setStatus("success")
          setTimeout(() => router.push("/dashboard/company"), 2000)
        } else {
          setStatus("error")
          setTimeout(() => router.push("/dashboard/company"), 3000)
        }
      })
      .catch(() => {
        setStatus("error")
        setTimeout(() => router.push("/dashboard/company"), 3000)
      })
  }, [router])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center max-w-sm w-full">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Confirming your availability…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-1">You're live!</p>
            <p className="text-slate-400 text-sm">Nearby homeowners can now find you on the map.</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
            <p className="text-white font-semibold mb-1">Something went wrong</p>
            <p className="text-slate-400 text-sm">Redirecting to your dashboard…</p>
          </>
        )}
      </div>
    </div>
  )
}
