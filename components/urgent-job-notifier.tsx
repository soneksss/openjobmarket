"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import {
  Zap, MapPin, X, CheckCircle2, Clock,
  ArrowLeft, ChevronRight, Banknote,
} from "lucide-react"

interface UrgentAlert {
  notifId: string
  jobId: string
  jobTitle: string
  jobLocation?: string
  jobDescription?: string
  budget?: string | null
  linkUrl: string
  shownAt: number
  homeownerUserId?: string | null
  urgencyType?: string | null
}

const SHOWN_KEY = "ujb_shown"
const AUTO_SECS = 30

/** Extract UUID from /jobs/{uuid} URL */
function extractJobId(url: string): string | null {
  const m = url.match(/\/jobs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  return m ? m[1] : null
}

function getShown(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}
function markShown(id: string) {
  try {
    const s = getShown(); s.add(id)
    localStorage.setItem(SHOWN_KEY, JSON.stringify([...s].slice(-50)))
  } catch {}
}

function formatBudget(
  min: number | null,
  max: number | null,
  period: string | null,
): string | null {
  if (!min && !max) return null
  const p = period === "hourly" ? "/hr" : period === "daily" ? "/day" : period === "weekly" ? "/wk" : ""
  if (min && max) return `£${min}–£${max}${p}`
  if (min) return `£${min}+${p}`
  return `Up to £${max}${p}`
}

/* ────────────────────────────────────────────────────────── */
/* Card — two phases: preview → detail                        */
/* ────────────────────────────────────────────────────────── */
function UrgentCard({
  alert,
  onApply,
  onSkip,
  applying,
  applied,
}: {
  alert: UrgentAlert
  onApply: () => void
  onSkip: () => void
  applying: boolean
  applied: boolean
}) {
  const [secs, setSecs]       = useState(AUTO_SECS)
  const [viewing, setViewing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (secs === 0) onSkip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs])

  const progress = (secs / AUTO_SECS) * 100

  /* ── DETAIL VIEW ── */
  if (viewing) {
    return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-orange-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">

          {/* Hero banner */}
          <div className="relative h-28 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 flex flex-col justify-end px-4 pb-3">
            {/* Close */}
            <button
              onClick={onSkip}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Back */}
            <button
              onClick={() => setViewing(false)}
              className="absolute top-3 left-3 flex items-center gap-1 text-white/70 hover:text-white text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            {/* Urgent badge */}
            <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full w-fit mb-1.5">
              <Zap className="w-3 h-3 fill-white" />
              Urgent Job
            </span>
            <h2 className="text-lg font-extrabold text-white leading-tight drop-shadow-sm">
              {alert.jobTitle}
            </h2>
          </div>

          {/* Job details */}
          <div className="px-4 py-3 space-y-2.5">
            {/* Location + Budget chips */}
            <div className="flex flex-wrap gap-2">
              {alert.jobLocation && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700/60">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {alert.jobLocation}
                </span>
              )}
              {alert.budget && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/25">
                  <Banknote className="w-3 h-3 flex-shrink-0" />
                  {alert.budget}
                </span>
              )}
            </div>

            {/* Description */}
            {alert.jobDescription ? (
              <p className="text-sm text-slate-300 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line">
                {alert.jobDescription}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic">No description provided.</p>
            )}

            {/* Timer */}
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Auto-dismisses in {secs}s · First come, first served
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-4 pb-5 pt-1">
            <button
              onClick={onSkip}
              disabled={applying || applied}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-white/10 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
            >
              Skip
            </button>
            <button
              onClick={onApply}
              disabled={applying || applied}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {applied ? (
                <><CheckCircle2 className="w-4 h-4" /> Applied!</>
              ) : applying ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Applying…</>
              ) : (
                "Apply & Message"
              )}
            </button>
          </div>

        </div>
      </div>
    )
  }

  /* ── PREVIEW (initial notification) ── */
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-orange-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Countdown bar */}
        <div className="h-1 bg-slate-700 w-full">
          <div
            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <span className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-orange-500/30">
            <Zap className="w-3 h-3 fill-orange-400" />
            Urgent Job Nearby
          </span>
          <button
            onClick={onSkip}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Job summary */}
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-white leading-tight mb-1.5">
            {alert.jobTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {alert.jobLocation && (
              <span className="flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {alert.jobLocation}
              </span>
            )}
            {alert.budget && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold">
                <Banknote className="w-3.5 h-3.5 flex-shrink-0" />
                {alert.budget}
              </span>
            )}
          </div>
          {alert.jobDescription && (
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
              {alert.jobDescription}
            </p>
          )}
        </div>

        {/* Timer */}
        <div className="px-4 pb-1">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Auto-dismisses in {secs}s · First come, first served
          </p>
        </div>

        {/* Buttons: Skip | View Job */}
        <div className="flex gap-3 px-4 pb-5 pt-2">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-white/10 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => setViewing(true)}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 transition-colors flex items-center justify-center gap-1.5"
          >
            View Job
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* Main notifier — mounts once in the layout                  */
/* ────────────────────────────────────────────────────────── */
export function UrgentJobNotifier({ userId }: { userId: string }) {
  const router   = useRouter()
  const supabase = createClient()

  const [current,  setCurrent]  = useState<UrgentAlert | null>(null)
  const [queue,    setQueue]    = useState<UrgentAlert[]>([])
  const [applying, setApplying] = useState(false)
  const [applied,  setApplied]  = useState(false)

  /* ── advance queue ── */
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue
      setCurrent(next)
      setQueue(rest)
      setApplied(false)
    }
  }, [current, queue])

  /* ── build an alert from a notification row ── */
  const enqueue = useCallback(async (notif: {
    id: string; title: string; link_url?: string; message?: string
  }) => {
    if (!notif.link_url) return

    const shown = getShown()
    if (shown.has(notif.id)) return

    const jobId = extractJobId(notif.link_url)
    if (!jobId) return

    // Don't show again if this user already skipped this job
    try {
      const { data: skip } = await supabase
        .from("job_skips")
        .select("id")
        .eq("job_id", jobId)
        .eq("user_id", userId)
        .maybeSingle()
      if (skip) return
    } catch {}

    markShown(notif.id)

    // Fetch job details — try full select first, fall back if optional columns missing
    let jobLocation    = ""
    let jobDescription = ""
    let homeownerUserId: string | null = null
    let urgencyType: string | null = null
    let budget: string | null = null

    try {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("location, description, homeowner_id, urgency_type, budget_min, budget_max, budget_period")
        .eq("id", jobId)
        .maybeSingle()

      if (jobData) {
        jobLocation    = jobData.location      ?? ""
        jobDescription = jobData.description   ?? ""
        urgencyType    = jobData.urgency_type  ?? null
        budget = formatBudget(jobData.budget_min, jobData.budget_max, jobData.budget_period)

        if (jobData.homeowner_id) {
          const { data: hp } = await supabase
            .from("homeowner_profiles")
            .select("user_id")
            .eq("id", jobData.homeowner_id)
            .maybeSingle()
          homeownerUserId = hp?.user_id ?? null
        }
      }
    } catch {}

    const alert: UrgentAlert = {
      notifId:        notif.id,
      jobId,
      jobTitle:       notif.title.replace(/^Urgent job near you:\s*/i, ""),
      jobLocation,
      jobDescription,
      budget,
      linkUrl:        notif.link_url,
      shownAt:        Date.now(),
      homeownerUserId,
      urgencyType,
    }

    setCurrent((prev) => {
      if (prev) { setQueue((q) => [...q, alert]); return prev }
      setApplied(false)
      return alert
    })
  }, [supabase, userId])

  /* ── load recent unread notifications on mount (last 2 hours) ── */
  useEffect(() => {
    const load = async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from("notifications")
        .select("id, title, link_url, message")
        .eq("user_id", userId)
        .eq("type", "urgent_job_dispatch")
        .gte("created_at", twoHoursAgo)
        .order("created_at", { ascending: false })
        .limit(3)

      if (data) {
        for (const n of [...data].reverse()) await enqueue(n)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  /* ── real-time: new INSERT ── */
  useEffect(() => {
    const ch = supabase
      .channel(`ujn_${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new as any
        if (n?.type === "urgent_job_dispatch") {
          enqueue({ id: n.id, title: n.title, link_url: n.link_url, message: n.message })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  /* ── skip ── */
  const handleSkip = useCallback(() => {
    if (current) {
      // Mark notification read
      supabase.from("notifications").update({ is_read: true }).eq("id", current.notifId).then(() => {})
      // Record skip so this job never appears again for this user
      supabase.from("job_skips").insert({ job_id: current.jobId, user_id: userId })
        .then(() => {})
        .catch(() => {}) // ignore if table doesn't exist yet
    }
    setCurrent(null)
    setApplied(false)
    setApplying(false)
  }, [current, supabase, userId])

  /* ── apply & message ── */
  const handleApply = useCallback(async () => {
    if (!current || applying || applied) return
    setApplying(true)
    try {
      const res = await fetch(`/api/jobs/${current.jobId}/urgent-responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      })
      if (res.ok || res.status === 409) {
        setApplied(true)
        supabase.from("notifications").update({ is_read: true }).eq("id", current.notifId).then(() => {})
        setTimeout(() => {
          const destination = current.homeownerUserId
            ? `/messages/new?recipient=${current.homeownerUserId}&job=${current.jobId}`
            : `/messages`
          router.push(destination)
          setCurrent(null)
          setApplied(false)
        }, 1200)
      }
    } catch (err) {
      console.error("[UrgentJobNotifier] Apply error:", err)
    } finally {
      setApplying(false)
    }
  }, [current, applying, applied, supabase, router])

  if (!current) return null

  return (
    <UrgentCard
      key={current.notifId}
      alert={current}
      onApply={handleApply}
      onSkip={handleSkip}
      applying={applying}
      applied={applied}
    />
  )
}
