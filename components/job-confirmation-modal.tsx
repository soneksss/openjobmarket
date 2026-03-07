"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Briefcase, Clock, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface ConfirmedJobOffer {
  id: string
  title: string
  confirmed_at: string   // ISO timestamp — used for 15-min countdown
  homeowner_id?: string
}

interface JobConfirmationModalProps {
  job: ConfirmedJobOffer
  onAccepted: () => void
  onDismiss: () => void
}

const WINDOW_SECONDS = 15 * 60   // 15 minutes

export function JobConfirmationModal({ job, onAccepted, onDismiss }: JobConfirmationModalProps) {
  const supabase = createClient()
  const { toast } = useToast()

  const [loading, setLoading]   = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  // ── countdown ──────────────────────────────────────────────
  useEffect(() => {
    const deadline = new Date(job.confirmed_at).getTime() + WINDOW_SECONDS * 1000

    const tick = () => setTimeLeft(Math.max(0, Math.floor((deadline - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [job.confirmed_at])

  const expired  = timeLeft === 0
  const urgent   = !expired && timeLeft < 120   // < 2 min = amber
  const minutes  = Math.floor(timeLeft / 60)
  const seconds  = timeLeft % 60

  // ── accept ─────────────────────────────────────────────────
  const handleAccept = async () => {
    if (expired || loading) return
    setLoading(true)
    try {
      const { error } = await supabase.rpc("accept_confirmed_job", { p_job_id: job.id })
      if (error) throw error
      setAccepted(true)
      toast({ title: "Job accepted!", description: `"${job.title}" is now active.` })
      setTimeout(onAccepted, 1500)
    } catch (err: any) {
      toast({
        title: "Could not accept",
        description: err.message ?? "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // ── colour token ───────────────────────────────────────────
  const colour = accepted ? "emerald" : expired ? "red" : urgent ? "amber" : "emerald"
  const stripClass = {
    emerald: "bg-emerald-500",
    red:     "bg-red-500",
    amber:   "bg-amber-500",
  }[colour]
  const ringClass = {
    emerald: "bg-emerald-500/20",
    red:     "bg-red-500/20",
    amber:   "bg-amber-500/20",
  }[colour]
  const iconClass = {
    emerald: "text-emerald-400",
    red:     "text-red-400",
    amber:   "text-amber-400",
  }[colour]
  const timerClass = accepted || urgent ? (accepted ? "text-emerald-400" : "text-amber-400") : "text-emerald-400"
  const bannerClass = {
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    red:     "bg-red-500/10 border-red-500/20",
    amber:   "bg-amber-500/10 border-amber-500/20",
  }[colour]

  return (
    // Full-screen overlay — rendered via portal in the dashboard
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">

        {/* urgency strip */}
        <div className={`h-1 w-full ${stripClass} transition-colors duration-500`} />

        <div className="p-6">

          {/* header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${ringClass}`}>
              {accepted
                ? <CheckCircle className={`w-6 h-6 ${iconClass}`} />
                : expired
                ? <AlertCircle className={`w-6 h-6 ${iconClass}`} />
                : <Briefcase className={`w-6 h-6 ${iconClass}`} />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {accepted ? "Job Accepted!" : expired ? "Offer Expired" : "You've been selected!"}
              </h2>
              <p className="text-slate-400 text-sm">
                {accepted
                  ? "The job is now active"
                  : expired
                  ? "The acceptance window has closed"
                  : "A homeowner wants you for this job"
                }
              </p>
            </div>
          </div>

          {/* job card */}
          <div className="bg-slate-800 rounded-xl p-4 mb-5">
            <h3 className="font-semibold text-white text-lg">{job.title}</h3>
          </div>

          {/* countdown / status */}
          {!accepted && (
            <div className={`flex items-center gap-3 rounded-xl p-4 mb-5 border ${bannerClass}`}>
              <Clock className={`w-5 h-5 flex-shrink-0 ${iconClass}`} />
              {expired ? (
                <p className="text-red-300 text-sm font-medium">
                  The 15-minute window expired. The job may be re-opened to other applicants.
                </p>
              ) : (
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">
                    Accept within
                  </p>
                  <p className={`text-3xl font-bold tabular-nums ${timerClass}`}>
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* actions */}
          <div className="flex gap-3">
            {!accepted && !expired && (
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-12 text-base"
                onClick={handleAccept}
                disabled={loading}
              >
                {loading ? "Accepting…" : "Accept Job"}
              </Button>
            )}
            <Button
              variant="outline"
              className={`${accepted || expired ? "flex-1" : ""} border-slate-600 text-slate-300 hover:bg-slate-800 h-12`}
              onClick={onDismiss}
            >
              {accepted ? "Close" : expired ? "Close" : "Decide Later"}
            </Button>
          </div>

          {!accepted && !expired && (
            <p className="text-xs text-slate-500 text-center mt-3">
              If you don't accept in time, the job will return to other applicants.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
