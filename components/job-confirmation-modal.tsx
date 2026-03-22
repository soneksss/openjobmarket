"use client"

import { useState } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { PartyPopper, X } from "lucide-react"

export interface ConfirmedJobOffer {
  id: string
  title: string
  confirmed_at: string
  homeowner_id?: string
  budget_min?: number | null
  budget_max?: number | null
  budget_period?: string | null
  location?: string | null
  application_id?: string | null
}

interface JobConfirmationModalProps {
  job: ConfirmedJobOffer
  onAccepted: () => void
  onDismiss: () => void
}

function formatBudget(min: number | null | undefined, max: number | null | undefined, period: string | null | undefined): string | null {
  if (!min && !max) return null
  const p = period === "hourly" ? "/hr" : period === "daily" ? "/day" : period === "weekly" ? "/wk" : ""
  if (min && max && min !== max) return `£${min}–£${max}${p}`
  if (min && max && min === max) return `£${min}${p}`
  if (min) return `£${min}+${p}`
  return `Up to £${max}${p}`
}

// Extract postcode (e.g. "PO9 5AZ") or first part of address
function shortLocation(location: string | null | undefined): string | null {
  if (!location) return null
  const m = location.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/i)
  if (m) return m[0].toUpperCase()
  return location.split(",")[0].trim() || null
}

export function JobConfirmationModal({ job, onAccepted, onDismiss }: JobConfirmationModalProps) {
  const supabase = createClient()
  const router   = useRouter()

  const [declining, setDeclining] = useState(false)
  const [messaging, setMessaging] = useState(false)

  const budget   = formatBudget(job.budget_min, job.budget_max, job.budget_period)
  const location = shortLocation(job.location)

  const goToJob = () => {
    router.push(`/jobs/${job.id}`)
    onDismiss()
  }

  const handleViewJob = (e: React.MouseEvent) => {
    e.stopPropagation()
    goToJob()
  }

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setMessaging(true)
    router.push("/messages")
    onAccepted()
  }

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeclining(true)
    try {
      if (job.application_id) {
        await fetch(`/api/jobs/${job.id}/tradesperson-decline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ application_id: job.application_id }),
        }).catch(() => {})
      }
    } finally {
      setDeclining(false)
      onDismiss()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
      onClick={goToJob}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebratory green bar */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 w-full" />

        <div className="p-6">
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss() }}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3 mb-5">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <PartyPopper className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">You&apos;re selected for the job</h2>
              <p className="text-slate-400 text-sm mt-0.5">Review details and arrange a visit</p>
            </div>
          </div>

          {/* Job card — clickable to /jobs/{id} */}
          <button
            onClick={handleViewJob}
            className="w-full text-left bg-slate-800 hover:bg-slate-750 rounded-xl p-4 mb-5 space-y-1.5 transition-colors group"
          >
            <h3 className="font-semibold text-white text-base group-hover:text-emerald-300 transition-colors">{job.title}</h3>
            {budget && <p className="text-sm font-semibold text-emerald-400">💰 {budget}</p>}
            {location && <p className="text-sm text-slate-300">📍 {location}</p>}
          </button>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {/* Primary */}
            <button
              onClick={handleViewJob}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors"
            >
              View Job
            </button>

            {/* Secondary */}
            <button
              onClick={handleMessage}
              disabled={messaging || declining}
              className="w-full py-3 rounded-xl text-sm font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 border border-slate-600 active:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {messaging ? "Opening…" : "Send Message"}
            </button>

            {/* Tertiary */}
            <button
              onClick={handleDecline}
              disabled={declining || messaging}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              {declining ? "Declining…" : "Decline"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
