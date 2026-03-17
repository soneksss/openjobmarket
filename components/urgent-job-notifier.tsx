"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import {
  Zap, MapPin, X, Clock, Banknote, ChevronRight,
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
  urgencyType?: string | null
}

const SHOWN_KEY  = "ujb_shown"
const AUTO_SECS  = 30

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

function formatBudget(min: number | null, max: number | null, period: string | null): string | null {
  if (!min && !max) return null
  const p = period === "hourly" ? "/hr" : period === "daily" ? "/day" : period === "weekly" ? "/wk" : ""
  if (min && max) return `£${min}–£${max}${p}`
  if (min) return `£${min}+${p}`
  return `Up to £${max}${p}`
}

/* ─────────────────────────────────────────────────────────── */
/* Notification card — quick preview                           */
/* ─────────────────────────────────────────────────────────── */
function UrgentCard({
  alert,
  onView,
  onSkip,
}: {
  alert: UrgentAlert
  onView: () => void
  onSkip: () => void
}) {
  const [secs, setSecs] = useState(AUTO_SECS)
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

  return (
    <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-5 sm:right-5 z-[400] sm:max-w-sm w-full animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-300">
      <div className="bg-slate-900 border border-orange-500/40 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Countdown bar */}
        <div className="h-1 bg-slate-800 w-full">
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
        <div className="px-4 py-3 space-y-2">
          <h2 className="text-base font-bold text-white leading-snug">{alert.jobTitle}</h2>

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
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {alert.jobDescription}
            </p>
          )}

          <p className="text-xs text-slate-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Auto-dismisses in {secs}s · First come, first served
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-4 pb-5 pt-1">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-white/10 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Skip
          </button>
          <button
            onClick={onView}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 transition-colors flex items-center justify-center gap-1.5"
          >
            View &amp; Apply
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/* Main notifier — mounts once in the layout                   */
/* ─────────────────────────────────────────────────────────── */
export function UrgentJobNotifier({ userId }: { userId: string }) {
  const router   = useRouter()
  const supabase = createClient()

  const [current, setCurrent] = useState<UrgentAlert | null>(null)
  const [queue,   setQueue]   = useState<UrgentAlert[]>([])

  /* ── advance queue ── */
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue
      setCurrent(next)
      setQueue(rest)
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

    let jobLocation    = ""
    let jobDescription = ""
    let urgencyType: string | null = null
    let budget: string | null = null

    try {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("location, description, urgency_type, budget_min, budget_max, budget_period")
        .eq("id", jobId)
        .maybeSingle()

      // Job was deleted or no longer accessible — silently skip (already marked shown)
      if (!jobData) return

      jobLocation    = jobData.location     ?? ""
      jobDescription = jobData.description  ?? ""
      urgencyType    = jobData.urgency_type ?? null
      budget = formatBudget(jobData.budget_min, jobData.budget_max, jobData.budget_period)
    } catch {}

    const alert: UrgentAlert = {
      notifId:     notif.id,
      jobId,
      jobTitle:    notif.title.replace(/^Urgent job near you:\s*/i, ""),
      jobLocation,
      jobDescription,
      budget,
      linkUrl:     notif.link_url,
      shownAt:     Date.now(),
      urgencyType,
    }

    setCurrent((prev) => {
      if (prev) { setQueue((q) => [...q, alert]); return prev }
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

  /* ── View & Apply: navigate to full job page ── */
  const handleView = useCallback(() => {
    if (!current) return
    // Mark notification as read (fire-and-forget)
    supabase.from("notifications").update({ is_read: true }).eq("id", current.notifId).then(() => {})
    // Navigate to the full job page — the job detail view shows photo, description,
    // and the UrgentJobApplySection with message textarea + quick-fill buttons.
    router.push(`/jobs/${current.jobId}`)
    setCurrent(null)
  }, [current, supabase, router])

  /* ── Skip: dismiss + record skip so this job never shows again ── */
  const handleSkip = useCallback(() => {
    if (!current) return
    supabase.from("notifications").update({ is_read: true }).eq("id", current.notifId).then(() => {})
    supabase.from("job_skips")
      .insert({ job_id: current.jobId, user_id: userId })
      .then(() => {})
      .catch(() => {})
    setCurrent(null)
  }, [current, supabase, userId])

  if (!current) return null

  return (
    <UrgentCard
      key={current.notifId}
      alert={current}
      onView={handleView}
      onSkip={handleSkip}
    />
  )
}
