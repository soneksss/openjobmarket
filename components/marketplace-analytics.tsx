"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts"
import {
  Users, Hammer, Zap, MapPin, Briefcase, CheckCircle2, Star, RefreshCw,
  Activity, Clock, TrendingUp, TrendingDown, AlertTriangle, Bell,
  MessageSquare, Repeat2, ShieldCheck, Wifi, BarChart2, Target, ArrowRight,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketplaceData {
  health: {
    totalHomeowners: number; tradespeopleTotal: number; activeTradespeopleNow: number
    tradespeopleOnMap: number; jobsPostedToday: number; jobsConfirmedToday: number
    jobsCompletedToday: number; urgentCount: number; flexibleCount: number
    homeownersLast7d: number; tradespeopleRegisteredLast7d: number; jobsLast7d: number
  }
  dispatch: {
    avgFirstResponseMins: number | null; avgTimeToThreeResponsesMins: number | null
    pctResolvedFirstRadius: number; pctRequiring10Mile: number; radiusExpansionCount: number
    noTradesFoundRate: number; expiryRate: number; totalUrgentJobs: number
  }
  funnel: {
    jobsPosted: number; jobsWithFirstResponse: number; jobsConfirmed: number
    chatsStarted: number; jobsCompleted: number
  }
  tradespersonHealth: {
    totalProfiles: number; availabilityPct: number; urgentAlertsPct: number
    flexibleAlertsPct: number; withLocationPct: number; avgResponseSpeedMins: number | null
  }
  geoInsights: { topTrades: Array<{ name: string; count: number }>; topLocations: Array<{ name: string; count: number }> }
  retention: { repeatHomeownersPct: number; cancellationRate: number; totalReviews: number; completedJobs: number; avgReviewsPerJob: number }
  systemHealth: { pushTokensTotal: number; activeDispatchJobs: number; conversationsTotal: number }
  registrationGrowth: Array<{ date: string; homeowners: number; tradespeople: number }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"]

const pct = (v: number | null | undefined) => v == null ? "—" : `${v}%`
const mins = (v: number | null | undefined) => {
  if (v == null) return "—"
  if (v < 1) return "<1m"
  if (v < 60) return `${Math.round(v)}m`
  return `${(v / 60).toFixed(1)}h`
}

// ─── Compact KPI card (~65px tall) ────────────────────────────────────────────

type Accent = "blue" | "green" | "amber" | "red" | "purple" | "cyan"
const ACCENT: Record<Accent, { bg: string; icon: string; border: string }> = {
  blue:   { bg: "bg-blue-500/10",   icon: "text-blue-400",   border: "border-blue-500/20"   },
  green:  { bg: "bg-green-500/10",  icon: "text-green-400",  border: "border-green-500/20"  },
  amber:  { bg: "bg-amber-500/10",  icon: "text-amber-400",  border: "border-amber-500/20"  },
  red:    { bg: "bg-red-500/10",    icon: "text-red-400",    border: "border-red-500/20"    },
  purple: { bg: "bg-purple-500/10", icon: "text-purple-400", border: "border-purple-500/20" },
  cyan:   { bg: "bg-cyan-500/10",   icon: "text-cyan-400",   border: "border-cyan-500/20"   },
}

function K({ title, value, icon: _Icon, accent = "blue", trend, trendLabel }: {
  title: string; value: string | number; icon: React.ElementType
  accent?: Accent; trend?: "up" | "down" | "neutral"; trendLabel?: string
}) {
  const a = ACCENT[accent]
  return (
    <div className={`bg-zinc-900 border ${a.border} rounded-xl px-2.5 py-1.5`}>
      <div className="text-xl font-bold text-white leading-none">{value}</div>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[10px] text-zinc-500 leading-tight truncate flex-1">{title}</span>
        {trendLabel && (
          <span className={`text-[10px] leading-none shrink-0 ${
            trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-zinc-600"
          }`}>
            {trend === "up" && "↑"}{trend === "down" && "↓"}{trendLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function S({ icon: Icon, title, color = "text-blue-400" }: { icon: React.ElementType; title: string; color?: string }) {
  return (
    <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-widest ${color}`}>
      <Icon className="h-3 w-3" />{title}
    </div>
  )
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function Bar_({ label, value, max, color = "#3b82f6" }: { label: string; value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.min(Math.round(value * 100 / max), 100) : 0
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-300">{value}</span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full">
        <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ─── Donut ring ───────────────────────────────────────────────────────────────

function Ring({ value, label, color }: { value: number; label: string; color: string }) {
  const d = [{ value }, { value: 100 - value }]
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative w-12 h-12">
        <PieChart width={48} height={48}>
          <Pie data={d} cx={20} cy={20} innerRadius={14} outerRadius={20} dataKey="value" startAngle={90} endAngle={-270}>
            <Cell fill={color} /><Cell fill="#27272a" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-white">{value}%</span>
        </div>
      </div>
      <span className="text-[9px] text-zinc-500 text-center leading-tight w-12">{label}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MarketplaceAnalytics() {
  const [data, setData] = useState<MarketplaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true)
      const res = await fetch("/api/admin/analytics/marketplace")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <Skeleton />
  if (error) return (
    <Card className="bg-zinc-900 border-red-900 py-0">
      <CardContent className="p-4 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <span className="text-red-400 text-sm">{error}</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => fetchData()}>Retry</Button>
      </CardContent>
    </Card>
  )
  if (!data) return null

  const { health, dispatch, funnel, tradespersonHealth, geoInsights, retention, systemHealth } = data
  const funnelMax = funnel.jobsPosted || 1
  const jobSplit = [{ name: "Urgent", value: health.urgentCount }, { name: "Flexible", value: health.flexibleCount }]

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Marketplace Intelligence</h1>
          <p className="text-zinc-600 text-xs">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading…"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}
          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 h-7 text-xs">
          <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "…" : "Refresh"}
        </Button>
      </div>

      {/* ── Registration Growth ──────────────────────────────────────────── */}
      <div>
        <S icon={TrendingUp} title="Registration Growth (30 days)" color="text-blue-400" />
        <Card className="bg-zinc-900 border-zinc-800 py-0">
          <CardContent className="p-3">
            {data.registrationGrowth.every(d => d.homeowners === 0 && d.tradespeople === 0) ? (
              <p className="text-zinc-600 text-xs py-3 text-center">No registrations in the last 30 days</p>
            ) : (
              <ResponsiveContainer width="100%" height={90}>
                <AreaChart data={data.registrationGrowth} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradHo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradTp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fill: "#52525b", fontSize: 9 }} allowDecimals={false} width={20} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 6, fontSize: 11 }} />
                  <Area type="monotone" dataKey="homeowners" stroke="#3b82f6" fill="url(#gradHo)" strokeWidth={1.5} dot={false} name="People looking for trades" />
                  <Area type="monotone" dataKey="tradespeople" stroke="#8b5cf6" fill="url(#gradTp)" strokeWidth={1.5} dot={false} name="Tradespeople" />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <div className="flex gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <span className="w-3 h-px bg-blue-500 inline-block" /> People looking for trades
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <span className="w-3 h-px bg-purple-500 inline-block" /> Tradespeople
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 1: Health (8 cards) + Dispatch (8 cards) ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

        {/* Health */}
        <div>
          <S icon={Activity} title="Marketplace Health" color="text-blue-400" />
          <div className="grid grid-cols-4 gap-1.5">
            <K title="People looking for trades" value={health.totalHomeowners.toLocaleString()} icon={Users} accent="blue"
              trend="up" trendLabel={`+${health.homeownersLast7d}w`} />
            <K title="Tradespeople" value={health.tradespeopleTotal.toLocaleString()} icon={Hammer} accent="purple"
              trend="up" trendLabel={`+${health.tradespeopleRegisteredLast7d}w`} />
            <K title="Available Now" value={health.activeTradespeopleNow} icon={Zap} accent="green"
              trendLabel={`${tradespersonHealth.availabilityPct}%`} trend="neutral" />
            <K title="On Live Map" value={health.tradespeopleOnMap} icon={MapPin} accent="cyan" />
            <K title="Posted Today" value={health.jobsPostedToday} icon={Briefcase} accent="amber"
              trendLabel={`${health.jobsLast7d}w`} trend="neutral" />
            <K title="Confirmed Today" value={health.jobsConfirmedToday} icon={CheckCircle2} accent="green" />
            <K title="Completed Today" value={health.jobsCompletedToday} icon={Star} accent="amber" />
            {/* Job split mini-card */}
            <Card className="bg-zinc-900 border-zinc-800 py-0">
              <CardContent className="p-2">
                <div className="text-[10px] text-zinc-500 mb-1.5">Type split (7d)</div>
                <div className="flex items-center gap-2">
                  <PieChart width={44} height={44}>
                    <Pie data={jobSplit} cx={18} cy={18} outerRadius={18} innerRadius={10} dataKey="value">
                      <Cell fill="#ef4444" /><Cell fill="#3b82f6" />
                    </Pie>
                  </PieChart>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-sm bg-red-500 inline-block" />
                      <span className="text-zinc-400">Urgent</span>
                      <span className="text-white font-bold ml-1">{health.urgentCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-sm bg-blue-500 inline-block" />
                      <span className="text-zinc-400">Flex</span>
                      <span className="text-white font-bold ml-1">{health.flexibleCount}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dispatch */}
        <div>
          <S icon={Zap} title="Dispatch Engine" color="text-red-400" />
          <div className="grid grid-cols-4 gap-1.5">
            <K title="Avg 1st Response" value={mins(dispatch.avgFirstResponseMins)} icon={Clock} accent="green" />
            <K title="Time to 3 Replies" value={mins(dispatch.avgTimeToThreeResponsesMins)} icon={Target} accent="blue" />
            <K title="Resolved @ 3mi" value={pct(dispatch.pctResolvedFirstRadius)} icon={CheckCircle2} accent="green"
              trendLabel={`${dispatch.totalUrgentJobs} jobs`} trend="neutral" />
            <K title="Needed 10mi" value={pct(dispatch.pctRequiring10Mile)} icon={MapPin}
              accent={dispatch.pctRequiring10Mile > 30 ? "amber" : "blue"} />
            <K title="No Match Found" value={pct(dispatch.noTradesFoundRate)} icon={AlertTriangle}
              accent={dispatch.noTradesFoundRate > 10 ? "red" : "amber"} />
            <K title="1hr Expiry Rate" value={pct(dispatch.expiryRate)} icon={Clock}
              accent={dispatch.expiryRate > 15 ? "red" : "amber"} />
            <K title="Radius Expansions" value={dispatch.radiusExpansionCount} icon={BarChart2} accent="purple" />
            <K title="Urgent Jobs (30d)" value={dispatch.totalUrgentJobs} icon={Zap} accent="cyan" />
          </div>
        </div>

      </div>

      {/* ── Row 2: Funnel + Tradesperson Health ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

        {/* Conversion Funnel */}
        <div>
          <S icon={TrendingUp} title="Conversion Funnel" color="text-amber-400" />
          <Card className="bg-zinc-900 border-zinc-800 py-0">
            <CardContent className="p-3 space-y-1">
              {[
                { label: "Jobs Posted",       value: funnel.jobsPosted,            color: "#3b82f6" },
                { label: "First Response",    value: funnel.jobsWithFirstResponse, color: "#8b5cf6" },
                { label: "Confirmed",         value: funnel.jobsConfirmed,         color: "#f59e0b" },
                { label: "Chat Started",      value: funnel.chatsStarted,          color: "#10b981" },
                { label: "Job Completed",     value: funnel.jobsCompleted,         color: "#22c55e" },
              ].map((step, i, arr) => {
                const w = Math.max((step.value / funnelMax) * 100, 3)
                const c = Math.round(step.value * 100 / funnelMax)
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-zinc-400">{step.label}</span>
                      <span className="text-white font-semibold">{step.value.toLocaleString()} <span className="text-zinc-600">({c}%)</span></span>
                    </div>
                    <div className="h-3 bg-zinc-800 rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${w}%`, backgroundColor: step.color }} />
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowRight className="h-2.5 w-2.5 text-zinc-700 rotate-90" />
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="pt-1.5 border-t border-zinc-800 flex gap-4 text-[10px] text-zinc-500">
                <span>Overall: <span className="text-white font-bold">{Math.round(funnel.jobsCompleted * 100 / funnelMax)}%</span></span>
                <span>Confirm rate: <span className="text-white font-bold">
                  {funnel.jobsWithFirstResponse > 0 ? Math.round(funnel.jobsConfirmed * 100 / funnel.jobsWithFirstResponse) : 0}%
                </span></span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tradesperson Supply Health */}
        <div>
          <S icon={Hammer} title="Tradesperson Supply Health" color="text-purple-400" />
          <Card className="bg-zinc-900 border-zinc-800 py-0">
            <CardContent className="p-3">
              <div className="flex items-center justify-around mb-2">
                <Ring value={tradespersonHealth.availabilityPct} label="Available" color="#10b981" />
                <Ring value={tradespersonHealth.urgentAlertsPct} label="Urgent ON" color="#ef4444" />
                <Ring value={tradespersonHealth.flexibleAlertsPct} label="Flex ON" color="#3b82f6" />
                <Ring value={tradespersonHealth.withLocationPct} label="On Map" color="#06b6d4" />
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{mins(tradespersonHealth.avgResponseSpeedMins)}</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">Avg response</div>
                  <div className="text-xl font-bold text-blue-400 mt-1">{tradespersonHealth.totalProfiles}</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">Profiles</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Bar_ label="Available (open for business)"
                  value={Math.round(tradespersonHealth.totalProfiles * tradespersonHealth.availabilityPct / 100)}
                  max={tradespersonHealth.totalProfiles} color="#10b981" />
                <Bar_ label="Urgent notifications on"
                  value={Math.round(tradespersonHealth.totalProfiles * tradespersonHealth.urgentAlertsPct / 100)}
                  max={tradespersonHealth.totalProfiles} color="#ef4444" />
                <Bar_ label="Flexible notifications on"
                  value={Math.round(tradespersonHealth.totalProfiles * tradespersonHealth.flexibleAlertsPct / 100)}
                  max={tradespersonHealth.totalProfiles} color="#3b82f6" />
                <Bar_ label="Location set (on map)"
                  value={Math.round(tradespersonHealth.totalProfiles * tradespersonHealth.withLocationPct / 100)}
                  max={tradespersonHealth.totalProfiles} color="#06b6d4" />
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ── Row 3: Geo + Retention + System ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">

        {/* Top Trades */}
        <div>
          <S icon={MapPin} title="Top Trades (30d)" color="text-cyan-400" />
          <Card className="bg-zinc-900 border-zinc-800 py-0">
            <CardContent className="p-3">
              {geoInsights.topTrades.length === 0 ? (
                <p className="text-zinc-600 text-xs py-3 text-center">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={geoInsights.topTrades.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fill: "#52525b", fontSize: 9 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "#a1a1aa", fontSize: 9 }} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 6, fontSize: 11 }} />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                      {geoInsights.topTrades.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {geoInsights.topLocations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1">
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Busiest Areas</div>
                  {geoInsights.topLocations.slice(0, 4).map((loc, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[9px] text-zinc-600 w-3">{i + 1}</span>
                      <span className="text-[10px] text-zinc-300 flex-1 truncate">{loc.name}</span>
                      <span className="text-[10px] text-white font-medium">{loc.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Retention */}
        <div>
          <S icon={Repeat2} title="Retention & Trust" color="text-green-400" />
          <div className="grid grid-cols-2 gap-1.5">
            <K title="Repeat Homeowners" value={pct(retention.repeatHomeownersPct)} icon={Repeat2}
              accent={retention.repeatHomeownersPct > 30 ? "green" : "amber"} />
            <K title="Cancellation Rate" value={pct(retention.cancellationRate)} icon={AlertTriangle}
              accent={retention.cancellationRate > 15 ? "red" : retention.cancellationRate > 8 ? "amber" : "green"} />
            <K title="Total Reviews" value={retention.totalReviews.toLocaleString()} icon={Star} accent="amber"
              trendLabel={`${retention.completedJobs} completed`} trend="neutral" />
            <K title="Reviews / Job" value={retention.avgReviewsPerJob.toFixed(1)} icon={ShieldCheck}
              accent={retention.avgReviewsPerJob >= 0.8 ? "green" : "amber"} />
          </div>
        </div>

        {/* System Health */}
        <div>
          <S icon={Wifi} title="System Health" color="text-emerald-400" />
          <div className="grid grid-cols-1 gap-1.5">
            <K title="Push Tokens Registered" value={systemHealth.pushTokensTotal.toLocaleString()} icon={Bell} accent="blue" />
            <K title="Active Dispatch Jobs" value={systemHealth.activeDispatchJobs} icon={Zap}
              accent={systemHealth.activeDispatchJobs > 10 ? "amber" : "green"} />
            <K title="Total Conversations" value={systemHealth.conversationsTotal.toLocaleString()} icon={MessageSquare} accent="purple" />
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-1.5"><div className="h-7 w-56 bg-zinc-800 rounded" /><div className="h-3 w-32 bg-zinc-800 rounded" /></div>
        <div className="h-7 w-20 bg-zinc-800 rounded" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {[0, 1].map(i => <div key={i} className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, j) => <div key={j} className="h-16 bg-zinc-900 border border-zinc-800 rounded-lg" />)}</div>)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {[0, 1].map(i => <div key={i} className="h-52 bg-zinc-900 border border-zinc-800 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {[0, 1, 2].map(i => <div key={i} className="h-44 bg-zinc-900 border border-zinc-800 rounded-lg" />)}
      </div>
    </div>
  )
}
