"use client"

import { useState } from "react"
import { CheckCircle, Send, Zap, PartyPopper, XCircle } from "lucide-react"

interface UrgentJobApplySectionProps {
  jobId: string
  hasApplied: boolean
  applicationStatus?: string | null
}

const QUICK_MESSAGES = ["I can come now", "Available today", "Need more details"]

export function UrgentJobApplySection({ jobId, hasApplied, applicationStatus }: UrgentJobApplySectionProps) {
  const [message, setMessage]   = useState("")
  const [loading, setLoading]   = useState(false)
  const [applied, setApplied]   = useState(hasApplied)
  const [error,   setError]     = useState<string | null>(null)

  const handleApply = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/urgent-responses`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ message: message.trim() || undefined }),
      })
      const data = await res.json()

      // 409 = already applied — treat as success
      if (res.status === 409 && data?.error?.toLowerCase().includes("already")) {
        setApplied(true)
        return
      }
      if (!res.ok) throw new Error(data?.error || "Failed to apply")

      setApplied(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Not selected — job filled by another tradesperson ───────────────────
  if (
    applicationStatus === "AUTO_CANCELLED" ||
    applicationStatus === "auto_cancelled" ||
    applicationStatus === "REJECTED" ||
    applicationStatus === "rejected"
  ) {
    return (
      <div className="rounded-xl border border-slate-600/40 bg-slate-800/60 p-5 text-center space-y-2">
        <XCircle className="h-7 w-7 text-slate-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-300">Not selected</p>
        <p className="text-xs text-slate-500">The homeowner chose another tradesperson for this job.</p>
      </div>
    )
  }

  // ── Selected by homeowner ────────────────────────────────────────────────
  if (applicationStatus === "CONFIRMED") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center space-y-2">
        <PartyPopper className="h-8 w-8 text-amber-400 mx-auto" />
        <p className="text-base font-semibold text-white">You've been selected!</p>
        <p className="text-sm text-slate-300">The homeowner chose you for this job.</p>
        <p className="text-xs text-slate-400">Check your messages to confirm details.</p>
      </div>
    )
  }

  // ── Confirmation state ──────────────────────────────────────────────────
  if (applied) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-1">
        <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto" />
        <p className="text-base font-semibold text-white">Application sent ✓</p>
        <p className="text-sm text-slate-400">Status: Waiting for homeowner</p>
      </div>
    )
  }

  // ── Apply form ──────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-orange-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-orange-400">Respond to this job</span>
      </div>

      {/* Quick-fill chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_MESSAGES.map((msg) => (
          <button
            key={msg}
            onClick={() => setMessage(msg)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              message === msg
                ? "bg-orange-500/30 border-orange-500/60 text-orange-300"
                : "bg-white/5 border-white/15 text-slate-400 hover:border-white/30 hover:text-white"
            }`}
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Message textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Hi, I can help with this job."
        rows={3}
        className="w-full resize-none rounded-lg bg-slate-800 border border-white/15 text-sm text-slate-200 placeholder:text-slate-500 px-3 py-2.5 focus:outline-none focus:border-orange-500/50"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Submit button */}
      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-semibold text-sm py-3 transition-colors"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Apply &amp; Send
          </>
        )}
      </button>
    </div>
  )
}
