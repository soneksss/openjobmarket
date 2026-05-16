"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

interface Props {
  jobId: string
  jobTitle: string
  redirectAfter?: string
}

export function MarkJobCompleteButton({ jobId, jobTitle, redirectAfter = "/dashboard/company/my-jobs?tab=history" }: Props) {
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    if (!confirmed) {
      setConfirmed(true)
      setErrorMsg(null)
      return
    }

    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/tradesperson-complete`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.error === "already_completed") {
          router.refresh()
          router.push(redirectAfter)
          return
        }
        setConfirmed(false)
        setErrorMsg(body.error ?? "Failed to mark complete. Please try again.")
        return
      }
      router.refresh()
      router.push(redirectAfter)
    } catch {
      setConfirmed(false)
      setErrorMsg("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
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
      {errorMsg && (
        <p className="text-[10px] text-red-400 leading-tight">{errorMsg}</p>
      )}
    </div>
  )
}
