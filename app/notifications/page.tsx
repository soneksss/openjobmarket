"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Bell, ArrowLeft, Briefcase, MessageCircle, Users,
  CheckCircle, AlertCircle, Clock, Star, Trash2,
  Zap, ExternalLink, Check,
} from "lucide-react"
import { createClient } from "@/lib/client"

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
  // Homeowner notification: link to job management page (shows applicants), not public job page
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
    case "job_accepted":     return <CheckCircle className="h-4 w-4 text-green-400" />
    case "job_rejected":     return <AlertCircle className="h-4 w-4 text-red-400" />
    case "job_expiring":     return <Clock className="h-4 w-4 text-amber-400" />
    case "review":           return <Star className="h-4 w-4 text-yellow-400" />
    case "urgent_job_dispatch":
    case "trade_job_match":  return <Zap className="h-4 w-4 text-orange-400 fill-orange-400" />
    default:                 return <Bell className="h-4 w-4 text-slate-400" />
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]             = useState(true)
  const [selectMode, setSelectMode]       = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [deleting, setDeleting]           = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) { router.push("/auth/login"); return }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) console.error("[NOTIFICATIONS] fetch error:", error.message)

      const notifs = data || []
      setNotifications(notifs)

      // Mark unread as read (non-blocking)
      const unreadIds = notifs.filter((n: Notification) => !n.is_read).map((n: Notification) => n.id)
      if (unreadIds.length > 0) {
        supabase.from("notifications").update({ is_read: true }).in("id", unreadIds)
      }
    } catch (err) {
      console.error("[NOTIFICATIONS] load error:", err)
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

  const allSelected = notifications.length > 0 && selected.size === notifications.length
  const selectAll   = () => setSelected(allSelected ? new Set() : new Set(notifications.map(n => n.id)))

  const handleNotifClick = async (n: Notification) => {
    if (selectMode) { toggleSelect(n.id); return }
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
          {notifications.length > 0 && (
            <button
              onClick={() => { setSelectMode(v => !v); setSelected(new Set()) }}
              className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500"
            >
              {selectMode ? "Cancel" : "Edit"}
            </button>
          )}
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
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-500">
            <Bell className="h-14 w-14 opacity-20 mb-3" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs mt-1">New alerts will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const isUrgent   = n.type === "urgent_job_dispatch" || n.type === "trade_job_match"
              const jobPageUrl = getJobPageUrl(n)
              const isSelected = selected.has(n.id)

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`relative flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : isUrgent && !n.is_read
                      ? "bg-orange-500/8 border-orange-500/30 hover:bg-orange-500/12"
                      : !n.is_read
                      ? "bg-blue-500/8 border-blue-500/25 hover:bg-blue-500/12"
                      : "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/90"
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
                      isUrgent ? "bg-orange-500/15" : "bg-slate-700/80"
                    }`}>
                      <NotifIcon type={n.type} />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${n.is_read ? "text-slate-300" : "text-white font-semibold"}`}>
                        {n.title}
                      </p>
                      {/* Unread dot */}
                      {!n.is_read && !selectMode && (
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${isUrgent ? "bg-orange-400" : "bg-blue-400"}`} />
                      )}
                    </div>

                    {n.message && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span className="text-[11px] text-slate-500">{formatTimeAgo(n.created_at)}</span>

                      {/* View Job button — only for job-related notifications, not in select mode */}
                      {!selectMode && jobPageUrl && (
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

                  {/* Delete bin — always visible, not in select mode */}
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
          </div>
        )}

      </div>
    </div>
  )
}
