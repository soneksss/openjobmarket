"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { X, Briefcase, PartyPopper } from "lucide-react"

/* ─────────────────────────────────────────────────────────── */
/* Sound helpers — Web Audio API, no files needed              */
/* ─────────────────────────────────────────────────────────── */
function playSound(type: "urgent" | "application" | "accepted") {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()

    const osc = (freq: number, start: number, duration: number, vol = 0.25) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = "sine"; o.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime + start)
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      o.start(ctx.currentTime + start)
      o.stop(ctx.currentTime + start + duration)
    }

    if (type === "urgent") {
      // Two quick ascending tones — attention-grabbing
      osc(880,  0,    0.18)
      osc(1100, 0.18, 0.18)
    } else if (type === "accepted") {
      // Three-note ascending chime — celebratory (C5 → E5 → G5)
      osc(523.25, 0,    0.25, 0.3)
      osc(659.25, 0.2,  0.25, 0.3)
      osc(783.99, 0.4,  0.5,  0.3)
    } else {
      // Single soft ding — friendly notification
      osc(523.25, 0, 0.9, 0.3)
    }
  } catch { /* silently ignore — audio blocked by browser policy */ }
}

/* ─────────────────────────────────────────────────────────── */
/* Shared types & helpers                                      */
/* ─────────────────────────────────────────────────────────── */
interface UrgentAlert {
  notifId:    string
  jobId:      string
  jobTitle:   string
  budget?:    string | null
  distanceMi?: number | null
  expiresAt?: string | null
  linkUrl:    string
  shownAt:    number
  urgencyType?: string | null
}

const SHOWN_KEY = "ujb_shown"
const AUTO_SECS = 30

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

function haversineDistanceMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return "Expired"
  const totalMins = Math.floor(ms / 60000)
  if (totalMins < 60) return `${totalMins}m left`
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return mins > 0 ? `${hrs}h ${mins}m left` : `${hrs}h left`
}

/* ─────────────────────────────────────────────────────────── */
/* Urgent job card — tradesperson                              */
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
  const [secs,     setSecs]     = useState(AUTO_SECS)
  const [timeLeft, setTimeLeft] = useState<string | null>(
    alert.expiresAt ? formatTimeLeft(alert.expiresAt) : null
  )
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-dismiss countdown
  useEffect(() => {
    timerRef.current = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (secs === 0) onSkip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs])

  // Live expiry countdown (updates every 30s)
  useEffect(() => {
    if (!alert.expiresAt) return
    const id = setInterval(() => setTimeLeft(formatTimeLeft(alert.expiresAt!)), 30_000)
    return () => clearInterval(id)
  }, [alert.expiresAt])

  const progress    = (secs / AUTO_SECS) * 100
  const distanceStr = alert.distanceMi != null
    ? `${alert.distanceMi < 0.1 ? "< 0.1" : alert.distanceMi.toFixed(1)} mi away`
    : null

  return (
    // Mobile: full-width from top, rounded bottom corners
    // Desktop sm+: top-right card, all corners rounded
    <div className="fixed inset-x-0 top-0 sm:inset-auto sm:top-5 sm:right-5 z-[500] sm:max-w-xs w-full">
      <div
        className="bg-slate-900 border-b sm:border border-orange-500/60 rounded-b-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: "notifSlideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        {/* Progress bar — drains as countdown ticks down */}
        <div className="h-1 bg-slate-800 w-full">
          <div
            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card body */}
        <div className="px-5 pt-4 pb-2">
          {/* Top row: countdown + dismiss */}
          <div className="flex items-center justify-between -mt-1 mb-3">
            <span className="text-xs font-bold text-red-500 tabular-nums">
              {secs}s
            </span>
            <button
              onClick={onSkip}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Key info */}
          <div className="space-y-1.5">
            <p className="text-base font-bold text-white leading-tight">
              🚨 {alert.jobTitle}
            </p>

            {alert.budget && (
              <p className="text-sm font-semibold text-emerald-400">
                💰 {alert.budget}
              </p>
            )}

            {distanceStr && (
              <p className="text-sm text-slate-300">
                📍 {distanceStr}
              </p>
            )}

            {timeLeft && (
              <p className="text-sm text-orange-400 font-medium">
                ⏳ {timeLeft}
              </p>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500 font-medium tracking-wide uppercase">
            Be first to respond
          </p>
        </div>

        {/* Buttons */}
        <div className="px-5 pb-5 pt-2 flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 active:bg-slate-600 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={onView}
            className="flex-[2] py-3 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 transition-colors"
          >
            View Job
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/* Accepted toast — "You got the job!" celebration            */
/* ─────────────────────────────────────────────────────────── */
function AcceptedToast({
  title:    jobTitle,
  linkUrl,
  onDismiss,
}: {
  title:    string
  linkUrl:  string
  onDismiss: () => void
}) {
  const router = useRouter()

  // Auto-dismiss after 8s
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="bg-slate-900 border-b sm:border border-emerald-500/70 rounded-b-2xl sm:rounded-2xl shadow-2xl overflow-hidden cursor-pointer"
      style={{ animation: "notifSlideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
      onClick={() => { router.push(linkUrl); onDismiss() }}
    >
      {/* Celebratory green bar */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 w-full" />

      <div className="px-5 py-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
          <PartyPopper className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-400">You got the job! 🎉</p>
          <p className="text-sm font-semibold text-white mt-0.5 leading-snug line-clamp-2">{jobTitle}</p>
          <p className="text-xs text-slate-400 mt-1">The homeowner selected you. Tap to view details.</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss() }}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/* Main notifier — tradesperson                                */
/* ─────────────────────────────────────────────────────────── */
export function UrgentJobNotifier({ userId }: { userId: string }) {
  const router   = useRouter()
  const supabase = createClient()

  const [current,       setCurrent]       = useState<UrgentAlert | null>(null)
  const [queue,         setQueue]         = useState<UrgentAlert[]>([])
  const [acceptedAlert, setAcceptedAlert] = useState<{ id: string; title: string; linkUrl: string } | null>(null)

  const userCoordsRef = useRef<{ lat: number; lon: number } | null>(null)

  /* ── fetch user coords once ── */
  useEffect(() => {
    const fetchUserCoords = async () => {
      const { data: pp } = await supabase
        .from("professional_profiles")
        .select("latitude, longitude")
        .eq("user_id", userId)
        .maybeSingle()
      if (pp?.latitude && pp?.longitude) {
        userCoordsRef.current = { lat: pp.latitude, lon: pp.longitude }
        return
      }
      const { data: cp } = await supabase
        .from("company_profiles")
        .select("latitude, longitude")
        .eq("user_id", userId)
        .maybeSingle()
      if (cp?.latitude && cp?.longitude) {
        userCoordsRef.current = { lat: cp.latitude, lon: cp.longitude }
      }
    }
    fetchUserCoords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  /* ── advance queue ── */
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue
      setCurrent(next)
      setQueue(rest)
    }
  }, [current, queue])

  /* ── build alert from notification row ── */
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

    let urgencyType: string | null = null
    let budget: string | null = null
    let distanceMi: number | null = null
    let expiresAt: string | null = null

    try {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("urgency_type, budget_min, budget_max, budget_period, latitude, longitude, expires_at")
        .eq("id", jobId)
        .maybeSingle()

      if (!jobData) return

      urgencyType = jobData.urgency_type ?? null
      budget      = formatBudget(jobData.budget_min, jobData.budget_max, jobData.budget_period)
      expiresAt   = jobData.expires_at ?? null

      if (jobData.latitude && jobData.longitude && userCoordsRef.current) {
        distanceMi = haversineDistanceMi(
          userCoordsRef.current.lat, userCoordsRef.current.lon,
          jobData.latitude, jobData.longitude
        )
      }
    } catch {}

    const alert: UrgentAlert = {
      notifId:    notif.id,
      jobId,
      jobTitle:   notif.title.replace(/^Urgent job near you:\s*/i, ""),
      budget,
      distanceMi,
      expiresAt,
      linkUrl:    notif.link_url,
      shownAt:    Date.now(),
      urgencyType,
    }

    playSound("urgent")

    setCurrent((prev) => {
      if (prev) { setQueue((q) => [...q, alert]); return prev }
      return alert
    })
  }, [supabase, userId])

  /* ── load recent unread on mount (last 2 hours) ── */
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

  /* ── real-time INSERT ── */
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
        } else if (n?.type === "job_accepted") {
          // Homeowner confirmed this tradesperson — show celebration toast
          playSound("accepted")
          setAcceptedAlert({
            id:      n.id,
            title:   n.message ?? n.title,
            linkUrl: n.link_url ?? "/messages",
          })
          void supabase.from("notifications").update({ is_read: true }).eq("id", n.id)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  /* ── View ── */
  const handleView = useCallback(() => {
    if (!current) return
    supabase.from("notifications").update({ is_read: true }).eq("id", current.notifId).then(() => {})
    router.push(`/jobs/${current.jobId}`)
    setCurrent(null)
  }, [current, supabase, router])

  /* ── Skip ── */
  const handleSkip = useCallback(() => {
    if (!current) return
    supabase.from("notifications").update({ is_read: true }).eq("id", current.notifId).then(() => {})
    supabase.from("job_skips")
      .insert({ job_id: current.jobId, user_id: userId })
      .then(() => {})
      .catch(() => {})
    setCurrent(null)
  }, [current, supabase, userId])

  if (!current && !acceptedAlert) return null

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes notifSlideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Urgent job alert takes priority; accepted toast shows below if both present */}
      {current && (
        <UrgentCard
          key={current.notifId}
          alert={current}
          onView={handleView}
          onSkip={handleSkip}
        />
      )}

      {/* Accepted toast — shown when no urgent alert is covering it */}
      {acceptedAlert && !current && (
        <div className="fixed inset-x-0 top-0 sm:inset-auto sm:top-5 sm:right-5 z-[500] sm:max-w-xs w-full">
          <AcceptedToast
            key={acceptedAlert.id}
            title={acceptedAlert.title}
            linkUrl={acceptedAlert.linkUrl}
            onDismiss={() => setAcceptedAlert(null)}
          />
        </div>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────── */
/* Homeowner notifier — fires when a tradesperson applies      */
/* ─────────────────────────────────────────────────────────── */
interface AppAlert {
  id:      string
  title:   string
  message: string
  linkUrl: string
}

function HomeownerToast({
  alert,
  onDismiss,
}: {
  alert: AppAlert
  onDismiss: () => void
}) {
  const router = useRouter()

  // Auto-dismiss after 6s
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="bg-slate-900 border-b sm:border border-emerald-500/60 rounded-b-2xl sm:rounded-2xl shadow-2xl overflow-hidden cursor-pointer"
      style={{ animation: "notifSlideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
      onClick={() => { router.push(alert.linkUrl); onDismiss() }}
    >
      {/* Accent bar */}
      <div className="h-1 bg-emerald-500 w-full" />

      <div className="px-5 py-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{alert.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{alert.message}</p>
          <p className="text-xs text-emerald-400 font-medium mt-1.5">Tap to review →</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss() }}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function HomeownerJobNotifier({ userId }: { userId: string }) {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<AppAlert[]>([])

  const dismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    supabase.from("notifications").update({ is_read: true }).eq("id", id).then(() => {})
  }, [supabase])

  /* ── real-time INSERT for homeowner ── */
  useEffect(() => {
    const ch = supabase
      .channel(`han_${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new as any
        if (n?.type === "job_application") {
          playSound("application")
          setAlerts((prev) => [
            ...prev,
            { id: n.id, title: n.title, message: n.message ?? "", linkUrl: n.link_url ?? "/dashboard/homeowner/jobs" },
          ])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (alerts.length === 0) return null

  // Show only the most recent toast at a time (stack-safe)
  const top = alerts[alerts.length - 1]

  return (
    <div className="fixed inset-x-0 top-0 sm:inset-auto sm:top-5 sm:right-5 z-[500] sm:max-w-xs w-full">
      <HomeownerToast key={top.id} alert={top} onDismiss={() => dismiss(top.id)} />
    </div>
  )
}
