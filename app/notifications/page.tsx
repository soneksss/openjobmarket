"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Bell, ArrowLeft, MessageCircle, Users,
  CheckCircle, AlertCircle, Clock, Star, Trash2,
  Zap, ExternalLink, Check, History,
} from "lucide-react"
import { createClient } from "@/lib/client"
import { JobExpiryBadge } from "@/components/job-expiry-badge"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link_url?: string | null
  action_url?: string | null
  is_read: boolean
  created_at: string
}

interface JobInfo {
  status: string | null
  is_active: boolean
  expires_at: string | null
}

const CLOSED_STATUSES = new Set(["closed", "filled", "expired", "cancelled", "completed"])

function isJobExpired(job: JobInfo): boolean {
  if (!job.is_active) return true
  const s = (job.status ?? "").toLowerCase()
  if (CLOSED_STATUSES.has(s)) return true
  if (job.expires_at && new Date(job.expires_at) < new Date()) return true
  return false
}

function extractJobId(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/\/jobs\/([0-9a-f-]{36})/i)
  return m ? m[1] : null
}

function getActionUrl(n: Notification) {
  return n.action_url || n.link_url || null
}

function getJobPageUrl(n: Notification): string | null {
  const jobId = extractJobId(getActionUrl(n))
  if (!jobId) return null
  if (n.type === "job_application") return `/dashboard/homeowner/jobs/${jobId}`
  return `/jobs/${jobId}`
}

function formatTimeAgo(dateString: string) {
  const secs = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (secs < 60) return "Just now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 172800) return "Yesterday"
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`
  return new Date(dateString).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case "job_application":  return <Users className="h-4 w-4 text-emerald-400" />
    case "new_message":
    case "message":          return <MessageCircle className="h-4 w-4 text-blue-400" />
    case "job_accepted":
    case "application_status_change": return <CheckCircle className="h-4 w-4 text-green-400" />
    case "job_rejected":     return <AlertCircle className="h-4 w-4 text-red-400" />
    case "job_expiring":     return <Clock className="h-4 w-4 text-amber-400" />
    case "review":           return <Star className="h-4 w-4 text-yellow-400" />
    case "urgent_job_dispatch":
    case "trade_job_match":  return <Zap className="h-4 w-4 text-orange-400 fill-orange-400" />
    default:                 return <Bell className="h-4 w-4 text-slate-400" />
  }
}

const JOB_NOTIF_TYPES = new Set([
  "job_application", "job_expiring", "urgent_job_dispatch", "trade_job_match",
  "job_accepted", "job_rejected",
])

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [jobMap, setJobMap]               = useState<Record<string, JobInfo>>({})
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [tab, setTab]                     = useState<"inbox" | "history">("inbox")
  const [selectMode, setSelectMode]       = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [deleting, setDeleting]           = useState<Set<string>>(new Set())
  // Per-tab visible count — persists across tab switches (no reset jitter)
  const [visibleCounts, setVisibleCounts] = useState<Record<"inbox" | "history", number>>({ inbox: 20, history: 20 })
  const [hasMoreFromDb, setHasMoreFromDb] = useState(false)
  const [loadingMore, setLoadingMore]     = useState(false)
  const lastCursorRef = useRef<string | null>(null)
  const userIdRef     = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 8_000)
    )

    try {
      await Promise.race([
        (async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) { router.push("/auth/login"); return }
          userIdRef.current = user.id

          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50)

          if (error) {
            console.error("[NOTIFICATIONS] fetch error:", error.message)
            throw new Error(error.message)
          }

          const notifs: Notification[] = data || []
          setNotifications(notifs)
          setHasMoreFromDb(notifs.length === 50)
          lastCursorRef.current = notifs.at(-1)?.created_at ?? null

          // Mark ALL unread notifications as read — use a where clause, not ID list,
          // so notifications beyond the 50-item fetch limit are also cleared.
          supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false)

          // Fetch job statuses for job-linked notifications
          const jobIds = new Set<string>()
          for (const n of notifs) {
            if (JOB_NOTIF_TYPES.has(n.type)) {
              const jobId = extractJobId(getActionUrl(n))
              if (jobId) jobIds.add(jobId)
            }
          }

          if (jobIds.size > 0) {
            const { data: jobs } = await supabase
              .from("jobs")
              .select("id, status, is_active, expires_at")
              .in("id", [...jobIds])
            const map: Record<string, JobInfo> = {}
            for (const j of jobs ?? []) {
              map[j.id] = { status: j.status, is_active: j.is_active, expires_at: j.expires_at }
            }
            setJobMap(map)
          }
        })(),
        timeout,
      ])
    } catch (err: any) {
      if (err?.message === "timeout") {
        setError("Loading timed out. Please check your connection and try again.")
      } else {
        console.error("[NOTIFICATIONS] load error:", err)
        setError("Failed to load notifications.")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const onVisible = () => { if (document.visibilityState === "visible") load() }
    const onFocus = () => load()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
    }
  }, [load])

  /* ── cursor-based load more from DB ── */
  const loadMore = useCallback(async () => {
    if (!lastCursorRef.current || !userIdRef.current || loadingMore) return
    setLoadingMore(true)
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userIdRef.current)
        .lt("created_at", lastCursorRef.current)
        .order("created_at", { ascending: false })
        .limit(50)

      const newNotifs: Notification[] = data || []

      // Fetch job statuses for newly loaded job-linked notifications
      const jobIds = new Set<string>()
      for (const n of newNotifs) {
        if (JOB_NOTIF_TYPES.has(n.type)) {
          const jobId = extractJobId(getActionUrl(n))
          if (jobId) jobIds.add(jobId)
        }
      }
      if (jobIds.size > 0) {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id, status, is_active, expires_at")
          .in("id", [...jobIds])
        if (jobs?.length) {
          setJobMap(prev => {
            const next = { ...prev }
            for (const j of jobs) {
              next[j.id] = { status: j.status, is_active: j.is_active, expires_at: j.expires_at }
            }
            return next
          })
        }
      }

      setNotifications(prev => [...prev, ...newNotifs])
      setHasMoreFromDb(newNotifs.length === 50)
      lastCursorRef.current = newNotifs.at(-1)?.created_at ?? lastCursorRef.current
    } catch (err) {
      console.error("[NOTIFICATIONS] loadMore error:", err)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore])

  /* ── helpers ── */
  function isExpiredNotif(n: Notification): boolean {
    if (!JOB_NOTIF_TYPES.has(n.type)) return false
    const jobId = extractJobId(getActionUrl(n))
    if (!jobId) return false
    const job = jobMap[jobId]
    if (!job) return false
    return isJobExpired(job)
  }

  /* ── delete single ── */
  const deleteOne = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleting(prev => new Set(prev).add(id))
    setNotifications(prev => prev.filter(n => n.id !== id))
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("notifications").delete().eq("id", id).eq("user_id", user.id)
    setDeleting(prev => { const s = new Set(prev); s.delete(id); return s })
  }, [])

  /* ── delete selected ── */
  const deleteSelected = useCallback(async () => {
    if (selected.size === 0) return
    const ids = [...selected]
    setNotifications(prev => prev.filter(n => !selected.has(n.id)))
    setSelected(new Set())
    setSelectMode(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("notifications").delete().in("id", ids)
  }, [selected])

  /* ── toggle selection ── */
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  /* ── get expires_at for a notification's linked job (if active) ── */
  function notifJobExpiresAt(n: Notification): string | null {
    const jobId = extractJobId(getActionUrl(n))
    if (!jobId) return null
    const job = jobMap[jobId]
    if (!job?.expires_at) return null
    if (new Date(job.expires_at) <= new Date()) return null
    return job.expires_at
  }

  /* ── partition ── */
  const inboxNotifs   = notifications.filter(n => !isExpiredNotif(n))
  const historyNotifs = notifications.filter(n => isExpiredNotif(n))
  const displayNotifs = tab === "inbox" ? inboxNotifs : historyNotifs

  const allSelected = displayNotifs.length > 0 && selected.size === displayNotifs.length
  const selectAll   = () => setSelected(allSelected ? new Set() : new Set(displayNotifs.map(n => n.id)))

  const handleNotifClick = async (n: Notification) => {
    if (selectMode) { toggleSelect(n.id); return }
    if (tab === "history") return // history items are non-interactive
    const url = getActionUrl(n)
    if (!url) return
    try {
      const parsed = new URL(url)
      router.push(parsed.pathname + parsed.search + parsed.hash)
    } catch {
      router.push(url)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <div className="max-w-xl mx-auto px-4 pt-5 space-y-4">

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-400" />
            Notifications
          </h1>
          {displayNotifs.length > 0 && (
            <button
              onClick={() => { setSelectMode(v => !v); setSelected(new Set()) }}
              className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500"
            >
              {selectMode ? "Cancel" : "Edit"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
          <button
            onClick={() => { setTab("inbox"); setSelectMode(false); setSelected(new Set()) }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-lg transition-colors ${
              tab === "inbox"
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            Inbox
            {inboxNotifs.length > 0 && (
              <span className="ml-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                {inboxNotifs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab("history"); setSelectMode(false); setSelected(new Set()) }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-lg transition-colors ${
              tab === "history"
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            History
            {historyNotifs.length > 0 && (
              <span className="ml-0.5 text-[10px] font-bold bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">
                {historyNotifs.length}
              </span>
            )}
          </button>
        </div>

        {/* Select-all bar — visible in edit mode */}
        {selectMode && (
          <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 animate-in fade-in duration-150">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-sm text-white font-medium"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                allSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-500"
              }`}>
                {allSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <button
              onClick={deleteSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 text-sm font-semibold text-red-400 disabled:opacity-30 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selected.size})
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center py-16 text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); load() }}
              className="text-sm text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg px-4 py-2 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : displayNotifs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-500">
            {tab === "inbox" ? (
              <>
                <Bell className="h-14 w-14 opacity-20 mb-3" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1">New alerts will appear here</p>
              </>
            ) : (
              <>
                <History className="h-14 w-14 opacity-20 mb-3" />
                <p className="text-sm font-medium">No history yet</p>
                <p className="text-xs mt-1">Expired and closed job notifications appear here</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {tab === "history" && (
              <p className="text-xs text-slate-500 px-1">
                Past notifications for jobs that are no longer active.
              </p>
            )}
            {displayNotifs.slice(0, visibleCounts[tab]).map((n) => {
              const isUrgent   = n.type === "urgent_job_dispatch" || n.type === "trade_job_match"
              const jobPageUrl = getJobPageUrl(n)
              const isSelected = selected.has(n.id)
              const isHistory  = tab === "history"

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`relative flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                    isHistory
                      ? "bg-slate-800/30 border-slate-700/30 opacity-60"
                      : isSelected
                      ? "bg-emerald-500/10 border-emerald-500/40 cursor-pointer"
                      : isUrgent && !n.is_read
                      ? "bg-orange-500/8 border-orange-500/30 hover:bg-orange-500/12 cursor-pointer"
                      : !n.is_read
                      ? "bg-blue-500/8 border-blue-500/25 hover:bg-blue-500/12 cursor-pointer"
                      : "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/90 cursor-pointer"
                  }`}
                >
                  {/* Select checkbox (edit mode) */}
                  {selectMode && (
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      isSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-500"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  )}

                  {/* Icon */}
                  {!selectMode && (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isHistory ? "bg-slate-700/40" : isUrgent ? "bg-orange-500/15" : "bg-slate-700/80"
                    }`}>
                      <NotifIcon type={n.type} />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm leading-snug ${isHistory ? "text-slate-500" : n.is_read ? "text-slate-300" : "text-white font-semibold"}`}>
                          {n.title}
                        </p>
                        {isHistory && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-500 border border-slate-600/50">
                            Expired
                          </span>
                        )}
                      </div>
                      {/* Unread dot — inbox only */}
                      {!n.is_read && !selectMode && !isHistory && (
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${isUrgent ? "bg-orange-400" : "bg-blue-400"}`} />
                      )}
                    </div>

                    {n.message && (
                      <p className={`text-xs mt-0.5 line-clamp-2 leading-relaxed ${isHistory ? "text-slate-600" : "text-slate-400"}`}>
                        {n.message}
                      </p>
                    )}

                    {/* Expiry countdown badge — inbox only, for jobs with an active expiry */}
                    {!isHistory && !selectMode && notifJobExpiresAt(n) && (
                      <div className="mt-2">
                        <JobExpiryBadge expiresAt={notifJobExpiresAt(n)!} />
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span className="text-[11px] text-slate-500">{formatTimeAgo(n.created_at)}</span>

                      {/* View Job button — inbox only, job-related notifications */}
                      {!selectMode && !isHistory && jobPageUrl && (
                        <Link
                          href={jobPageUrl}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            isUrgent
                              ? "bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25"
                              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                          }`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {n.type === "job_application" ? "View Application" : "View Job"}
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Delete bin */}
                  {!selectMode && (
                    <button
                      onClick={(e) => deleteOne(n.id, e)}
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}

            {/* Show more already-fetched items without a network request */}
            {visibleCounts[tab] < displayNotifs.length && (
              <button
                onClick={() => setVisibleCounts(prev => ({ ...prev, [tab]: prev[tab] + 20 }))}
                className="w-full py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors"
              >
                Show more ({displayNotifs.length - visibleCounts[tab]} remaining)
              </button>
            )}
            {/* Fetch next page from DB once all local items are visible */}
            {visibleCounts[tab] >= displayNotifs.length && hasMoreFromDb && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors disabled:opacity-40"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
