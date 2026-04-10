"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

interface Props {
  jobId: string
  jobTitle: string
}

export function MarkJobCompleteButton({ jobId, jobTitle }: Props) {
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const router = useRouter()

  async function handleClick() {
    if (!confirmed) {
      setConfirmed(true)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/tradesperson-complete`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.error === "already_completed") {
          router.refresh()
          return
        }
        console.error("[MarkJobComplete] API error:", body.error)
        setConfirmed(false)
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${
        confirmed
          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
          : "bg-slate-700 hover:bg-slate-600 text-slate-200"
      }`}
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      {loading ? "Completing…" : confirmed ? "Confirm Complete" : "Mark as Completed"}
    </button>
  )
}
