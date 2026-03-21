"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

interface UrgentAlert {
  notifId: string
  jobId: string
  jobTitle: string
  budget?: string | null
  distanceMi?: number | null
  expiresAt?: string | null
  linkUrl: string
  shownAt: number
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
/* Notification card                                           */
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

  const progress = (secs / AUTO_SECS) * 100
  const distanceStr = alert.distanceMi != null
    ? `${alert.distanceMi < 0.1 ? "< 0.1" : alert.distanceMi.toFixed(1)} mi away`
    : null

  return (
    <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-5 sm:right-5 z-[400] sm:max-w-xs w-full animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-300">
      <div className="bg-slate-900 border border-orange-500/50 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Auto-dismiss progress bar */}
        <div className="h-1 bg-slate-800 w-full">
          <div
            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card body */}
        <div className="px-5 pt-4 pb-2">
          {/* Dismiss button */}
          <div className="flex justify-end -mt-1 mb-2">
            <button
              onClick={onSkip}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Key info — large, scannable */}
          <div className="space-y-2">
            <p className="text-lg font-bold text-white leading-tight">
              🚨 {alert.jobTitle}
            </p>

            {alert.budget && (
              <p className="text-base font-semibold text-emerald-400">
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

          {/* CTA line */}
          <p className="mt-3 text-xs text-slate-500 font-medium tracking-wide uppercase">
            Be first to respond
          </p>
        </div>

        {/* View Job button */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={onView}
            className="w-full py-3.5 rounded-xl text-base font-bold text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 transition-colors"
          >
            View Job
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

  // Cache user's own coordinates (fetched once)
  const userCoordsRef = useRef<{ lat: number; lon: number } | null>(null)

  /* ── fetch user's own location once ── */
  useEffect(() => {
    const fetchUserCoords = async () => {
      // Try professional_profiles first, then company_profiles
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

  /* ── View Job ── */
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
