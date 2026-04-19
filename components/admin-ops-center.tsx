"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Zap, AlertTriangle, Clock, MapPin, Users, Bell, RefreshCw,
  ChevronRight, Radio, Hammer, ThumbsUp, ThumbsDown, Shield,
  Activity, Ban, Star, MessageSquare, Wrench, Settings,
  Search, Trash2, Flag, ToggleLeft, XCircle, CheckCircle2,
  ArrowUpRight,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveData {
  generatedAt: string
  statusBar: {
    activeUrgentJobs: number
    jobsWaitingResponse: number
    jobsExpandingRadius: number
    noMatchJobs: number
    onlineTradespeople: number
    pushTokens: number
    lastCronMins: number | null
    systemOk: boolean
  }
  attentionAlerts: Alert[]
  dispatchStream: DispatchEvent[]
  supplyGaps: Array<{ industry: string; count: number }>
  deadZones: Array<{ location: string; count: number }>
  trustFlags: { reportsToday: number; highCancelCount: number; lowRatingsToday: number }
  feedbackSnapshot: Array<{ type: "like" | "dislike"; message: string | null; pageUrl: string | null; createdAt: string }>
}

interface Alert {
  type: string
  severity: "warning" | "critical"
  message: string
  jobId?: string
  age?: number
  count?: number
  industry?: string
  location?: string
}

interface DispatchEvent {
  jobId: string
  title: string
  location: string
  industry: string
  startedAt: string
  radiusMiles: number
  state: string
  status: string
  alertCount: number
  responseCount: number
  firstResponseMins: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ago(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diff < 1) return "just now"
  if (diff < 60) return `${diff}m ago`
  return `${Math.round(diff / 60)}h ago`
}

function Dot({ color }: { color: "green" | "amber" | "red" | "zinc" }) {
  const cls = {
    green: "bg-green-500 shadow-green-500/50",
    amber: "bg-amber-400 shadow-amber-400/50",
    red:   "bg-red-500 shadow-red-500/50",
    zinc:  "bg-zinc-600",
  }[color]
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${cls} ${color !== "zinc" ? "shadow-sm animate-pulse" : ""}`} />
  )
}

function Pill({ label, value, dotColor, href }: {
  label: string; value: string | number; dotColor: "green" | "amber" | "red" | "zinc"; href?: string
}) {
  const inner = (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <Dot color={dotColor} />
      <span className="text-sm font-bold text-white">{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

const ALERT_ICON: Record<string, React.ElementType> = {
  no_response:       Clock,
  near_expansion:    MapPin,
  near_expiry:       XCircle,
  cancellation_spike: Ban,
  low_ratings:       Star,
  reports:           Flag,
}

const STATE_COLOR: Record<string, string> = {
  searching:  "text-amber-400",
  expanding:  "text-orange-400",
  completed:  "text-green-400",
  expired:    "text-zinc-600",
  unknown:    "text-zinc-500",
}

const STATUS_COLOR: Record<string, string> = {
  POSTED:    "text-blue-400",
  CONFIRMED: "text-green-400",
  ACTIVE:    "text-green-300",
  COMPLETED: "text-emerald-400",
  CANCELLED: "text-zinc-600",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: Alert }) {
  const Icon = ALERT_ICON[alert.type] ?? AlertTriangle
  const isCrit = alert.severity === "critical"
  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
      isCrit
        ? "bg-red-950/30 border-red-800/60 text-red-300"
        : "bg-amber-950/30 border-amber-800/50 text-amber-300"
    }`}>
      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isCrit ? "text-red-400" : "text-amber-400"}`} />
      <div className="min-w-0">
        <p className="text-xs font-medium leading-snug">{alert.message}</p>
        {alert.age !== undefined && (
          <p className="text-[10px] mt-0.5 opacity-60">
            {alert.type === "near_expiry" ? `expires in ${alert.age}m` : `${alert.age}m elapsed`}
          </p>
        )}
      </div>
      {isCrit && (
        <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-widest text-red-500 bg-red-950 px-1.5 py-0.5 rounded">
          URGENT
        </span>
      )}
    </div>
  )
}

function StreamRow({ ev, isNew }: { ev: DispatchEvent; isNew: boolean }) {
  const stateColor = STATE_COLOR[ev.state] ?? "text-zinc-500"
  const statusColor = STATUS_COLOR[ev.status] ?? "text-zinc-500"
  return (
    <div className={`py-2 px-3 border-b border-zinc-800/60 last:border-0 transition-all duration-500 ${
      isNew ? "bg-blue-500/5" : ""
    }`}>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-xs font-medium text-zinc-200 truncate">{ev.title}</span>
        <span className={`text-[10px] font-semibold shrink-0 ${statusColor}`}>{ev.status}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
        <MapPin className="h-2.5 w-2.5" />
        <span className="truncate">{ev.location}</span>
        <span className="shrink-0">·</span>
        <span className={`shrink-0 ${stateColor}`}>{ev.state}</span>
        <span>·</span>
        <span className="shrink-0">{ev.radiusMiles}mi</span>
        {ev.responseCount > 0 && (
          <>
            <span>·</span>
            <span className="text-green-500 shrink-0">{ev.responseCount} replied</span>
          </>
        )}
        {ev.firstResponseMins !== null && (
          <>
            <span>·</span>
            <span className="text-green-400 shrink-0">1st {ev.firstResponseMins}m</span>
          </>
        )}
        <span className="ml-auto shrink-0">{ago(ev.startedAt)}</span>
      </div>
    </div>
  )
}

const QUICK_LINKS = [
  { label: "Dispatch Monitor",  href: "/admin/jobs",               icon: Zap,       color: "text-red-400"    },
  { label: "Reported Users",    href: "/admin/reported-users",     icon: Flag,       color: "text-amber-400"  },
  { label: "User Management",   href: "/admin/users",              icon: Users,      color: "text-blue-400"   },
  { label: "All Jobs",          href: "/admin/jobs",               icon: Briefcase,  color: "text-purple-400" },
  { label: "Push Tokens",       href: "/admin/settings",           icon: Bell,       color: "text-cyan-400"   },
  { label: "Feature Flags",     href: "/admin/settings",           icon: ToggleLeft, color: "text-green-400"  },
  { label: "Analytics",         href: "/admin/analytics",          icon: Activity,   color: "text-indigo-400" },
  { label: "System Settings",   href: "/admin/settings",           icon: Settings,   color: "text-zinc-400"   },
]

function Briefcase(p: any) { return <Wrench {...p} /> }

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdminOpsCenter() {
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [newJobIds, setNewJobIds] = useState<Set<string>>(new Set())
  const prevJobIds = useRef<Set<string>>(new Set())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/admin/dashboard/live")
      if (!res.ok) return
      const json: LiveData = await res.json()

      // Detect newly dispatched jobs for the flash animation
      const incoming = new Set(json.dispatchStream.map((e) => e.jobId))
      const fresh = new Set([...incoming].filter((id) => !prevJobIds.current.has(id)))
      setNewJobIds(fresh)
      prevJobIds.current = incoming
      setTimeout(() => setNewJobIds(new Set()), 3000)

      setData(json)
    } catch {}
    setLoading(false)
    setRefreshing(false)
    setCountdown(30)
  }, [])

  // Auto-refresh every 30 s with countdown
  useEffect(() => {
    load()
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { load(true); return 30 }
        return c - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [load])

  if (loading) return <OpsLoader />

  const d = data!
  const { statusBar: sb, attentionAlerts, dispatchStream, supplyGaps, deadZones, trustFlags, feedbackSnapshot } = d
  const critCount = attentionAlerts.filter((a) => a.severity === "critical").length
  const hasIssues = attentionAlerts.length > 0

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="h-5 w-5 text-green-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-ping" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Operations Center</h1>
            <p className="text-[10px] text-zinc-600 leading-none">Live · refreshes in {countdown}s</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => load(true)} disabled={refreshing}
          className="h-7 px-2 text-zinc-500 hover:text-white hover:bg-zinc-800">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-zinc-900 flex flex-wrap gap-2">
        <Pill label="active urgent"   value={sb.activeUrgentJobs}     dotColor={sb.activeUrgentJobs > 0 ? "amber" : "green"} />
        <Pill label="waiting reply"   value={sb.jobsWaitingResponse}  dotColor={sb.jobsWaitingResponse > 2 ? "amber" : "green"} />
        <Pill label="expanding radius" value={sb.jobsExpandingRadius}  dotColor={sb.jobsExpandingRadius > 0 ? "amber" : "green"} />
        <Pill label="no match"        value={sb.noMatchJobs}          dotColor={sb.noMatchJobs > 0 ? "red" : "green"} />
        <Pill label="tradespeople online" value={sb.onlineTradespeople} dotColor={sb.onlineTradespeople > 0 ? "green" : "red"} href="/admin/users" />
        <Pill label="push tokens"     value={sb.pushTokens}           dotColor={sb.pushTokens > 0 ? "green" : "amber"} />
        <Pill
          label={sb.lastCronMins === null ? "no dispatch yet" : `cron ${sb.lastCronMins}m ago`}
          value={sb.systemOk ? "OK" : "SLOW"}
          dotColor={sb.systemOk ? "green" : "red"}
        />
      </div>

      {/* ── Three-column body ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px_200px] gap-0 divide-y xl:divide-y-0 xl:divide-x divide-zinc-900">

        {/* ── LEFT: Attention + Supply gaps ──────────────────────────── */}
        <div className="p-4 space-y-4">

          {/* Attention queue */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-3.5 w-3.5 ${critCount > 0 ? "text-red-400" : "text-amber-400"}`} />
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Needs Attention
              </span>
              {attentionAlerts.length > 0 && (
                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  critCount > 0 ? "bg-red-900/60 text-red-400" : "bg-amber-900/40 text-amber-400"
                }`}>
                  {attentionAlerts.length} alert{attentionAlerts.length > 1 ? "s" : ""}
                  {critCount > 0 ? ` · ${critCount} critical` : ""}
                </span>
              )}
            </div>
            {attentionAlerts.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-zinc-400">All clear — no active alerts</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {attentionAlerts.map((a, i) => <AlertCard key={i} alert={a} />)}
              </div>
            )}
          </div>

          {/* Supply gaps */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hammer className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Supply Gaps</span>
            </div>
            {supplyGaps.length === 0 && deadZones.length === 0 ? (
              <p className="text-xs text-zinc-600 px-1">No supply gaps detected in last 24h</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {supplyGaps.map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-amber-900/40">
                    <div>
                      <p className="text-xs font-medium text-amber-300">{g.industry}</p>
                      <p className="text-[10px] text-zinc-600">no responses</p>
                    </div>
                    <span className="text-lg font-bold text-amber-400">{g.count}</span>
                  </div>
                ))}
                {deadZones.map((z, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-orange-900/40">
                    <div>
                      <p className="text-xs font-medium text-orange-300 truncate max-w-[90px]">{z.location}</p>
                      <p className="text-[10px] text-zinc-600">10-mile expansion</p>
                    </div>
                    <span className="text-lg font-bold text-orange-400">{z.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trust flags */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Trust & Safety</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Reports today",   value: trustFlags.reportsToday,    color: trustFlags.reportsToday > 0 ? "border-red-800/60 text-red-400" : "border-zinc-800 text-zinc-600",    href: "/admin/reported-users" },
                { label: "Cancel spikes",   value: trustFlags.highCancelCount, color: trustFlags.highCancelCount > 0 ? "border-amber-800/50 text-amber-400" : "border-zinc-800 text-zinc-600", href: "/admin/users" },
                { label: "Low ratings 24h", value: trustFlags.lowRatingsToday, color: trustFlags.lowRatingsToday >= 3 ? "border-amber-800/50 text-amber-400" : "border-zinc-800 text-zinc-600", href: "/admin/users" },
              ].map((f) => (
                <Link key={f.label} href={f.href}>
                  <div className={`p-2.5 rounded-lg bg-zinc-900 border ${f.color} hover:bg-zinc-800 transition-colors text-center`}>
                    <div className={`text-xl font-bold ${f.color.split(" ")[1]}`}>{f.value}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{f.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Feedback snapshot */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Latest Feedback</span>
              <Link href="/admin/analytics" className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5">
                Full history <ArrowUpRight className="h-2.5 w-2.5" />
              </Link>
            </div>
            {feedbackSnapshot.length === 0 ? (
              <p className="text-xs text-zinc-600 px-1">No feedback yet</p>
            ) : (
              <div className="space-y-1.5">
                {feedbackSnapshot.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    {f.type === "like"
                      ? <ThumbsUp className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                      : <ThumbsDown className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />}
                    <p className="text-[11px] text-zinc-400 flex-1 leading-snug">
                      {f.message || <span className="italic text-zinc-600">no message</span>}
                    </p>
                    <span className="text-[10px] text-zinc-700 shrink-0 ml-1">{ago(f.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Dispatch stream ─────────────────────────────────── */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Live Dispatch</span>
            <span className="ml-auto text-[10px] text-zinc-700">last 24h</span>
          </div>
          <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <CardContent className="p-0">
              {dispatchStream.length === 0 ? (
                <p className="text-xs text-zinc-600 p-4 text-center">No dispatch activity yet</p>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  {dispatchStream.map((ev) => (
                    <StreamRow key={ev.jobId} ev={ev} isNew={newJobIds.has(ev.jobId)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Quick controls ───────────────────────────────────── */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Quick Controls</span>
          </div>
          <div className="space-y-1.5">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href + link.label} href={link.href}>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition-all group">
                  <link.icon className={`h-3.5 w-3.5 shrink-0 ${link.color}`} />
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">{link.label}</span>
                  <ChevronRight className="h-3 w-3 text-zinc-700 ml-auto group-hover:text-zinc-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OpsLoader() {
  return (
    <div className="min-h-screen bg-[#080808] animate-pulse">
      <div className="px-5 pt-5 pb-3 border-b border-zinc-900 flex items-center gap-3">
        <div className="h-5 w-5 rounded-full bg-zinc-800" />
        <div className="h-5 w-44 bg-zinc-800 rounded" />
      </div>
      <div className="px-5 py-3 border-b border-zinc-900 flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-7 w-28 bg-zinc-900 rounded-full" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px_200px] gap-4 p-4">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-zinc-900 rounded-lg" />)}</div>
        <div className="h-96 bg-zinc-900 rounded-lg" />
        <div className="space-y-1.5">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-9 bg-zinc-900 rounded-lg" />)}</div>
      </div>
    </div>
  )
}
