"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  Users, Hammer, Briefcase, CheckCircle2, RefreshCw, AlertTriangle,
  TrendingUp, PoundSterling,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketplaceData {
  totalUsers: number
  totalHomeowners: number
  totalTradespeople: number
  totalJobsPosted: number
  totalJobsCompleted: number
  mostPopularJobs: Array<{ name: string; count: number }>
  revenue: number | null
}

interface GrowthData {
  registrationGrowth: Array<{ date: string; homeowners: number; tradespeople: number }>
  visitorGrowth: Array<{ date: string; visitors: number; signups: number }>
  hasVisitorData: boolean
}

// Validated pair (CVD-safe on the zinc-900 dashboard surface — see dataviz skill).
// Reused across both growth charts: slot 1 = the broader population, slot 2 = the subset.
const SERIES_BLUE = "#3987e5"
const SERIES_AQUA = "#199e70"

type TimeRange = "30d" | "6m" | "1y" | "max"
const RANGES: Array<{ key: TimeRange; label: string }> = [
  { key: "30d", label: "30 Days" },
  { key: "6m",  label: "6 Months" },
  { key: "1y",  label: "1 Year" },
  { key: "max", label: "Max" },
]

// ─── Compact KPI card ─────────────────────────────────────────────────────────

type Accent = "blue" | "green" | "amber" | "purple" | "cyan"
const ACCENT: Record<Accent, { bg: string; icon: string; border: string }> = {
  blue:   { bg: "bg-blue-500/10",   icon: "text-blue-400",   border: "border-blue-500/20"   },
  green:  { bg: "bg-green-500/10",  icon: "text-green-400",  border: "border-green-500/20"  },
  amber:  { bg: "bg-amber-500/10",  icon: "text-amber-400",  border: "border-amber-500/20"  },
  purple: { bg: "bg-purple-500/10", icon: "text-purple-400", border: "border-purple-500/20" },
  cyan:   { bg: "bg-cyan-500/10",   icon: "text-cyan-400",   border: "border-cyan-500/20"   },
}

function K({ title, value, icon: Icon, accent = "blue", note }: {
  title: string; value: string | number; icon: React.ElementType
  accent?: Accent; note?: string
}) {
  const a = ACCENT[accent]
  return (
    <div className={`bg-zinc-900 border ${a.border} rounded-xl p-4`}>
      <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center mb-3`}>
        <Icon className={`h-4 w-4 ${a.icon}`} />
      </div>
      <div className="text-2xl font-bold text-white leading-none">{value}</div>
      <div className="text-xs text-zinc-500 mt-1.5">{title}</div>
      {note && <div className="text-[10px] text-zinc-600 mt-0.5">{note}</div>}
    </div>
  )
}

// ─── Hero KPI card — the headline growth/traction numbers ─────────────────────

function Hero({ title, value, icon: Icon, note, muted = false }: {
  title: string; value: string | number; icon: React.ElementType
  note?: string; muted?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 border ${
      muted
        ? "border-dashed border-zinc-700 bg-zinc-900/50"
        : "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${muted ? "text-zinc-600" : "text-emerald-400"}`} />
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${muted ? "text-zinc-600" : "text-zinc-400"}`}>{title}</span>
      </div>
      <div className={`text-3xl md:text-4xl font-bold leading-none ${muted ? "text-zinc-600" : "text-white"}`}>{value}</div>
      {note && <div className="text-[10px] text-zinc-600 mt-1.5">{note}</div>}
    </div>
  )
}

// ─── Most popular jobs — ranked bar list ───────────────────────────────────────

function PopularJobsList({ jobs }: { jobs: Array<{ name: string; count: number }> }) {
  if (jobs.length === 0) {
    return <p className="text-zinc-600 text-xs py-6 text-center">No jobs posted yet</p>
  }
  const max = jobs[0]?.count || 1
  return (
    <div className="space-y-3">
      {jobs.map((job, i) => (
        <div key={job.name}>
          <div className="flex justify-between items-baseline text-xs mb-1">
            <span className="text-zinc-300 font-medium">{i + 1}. {job.name}</span>
            <span className="text-zinc-500">{job.count} job{job.count === 1 ? "" : "s"}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${Math.max(4, Math.round((job.count * 100) / max))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Time-range switcher — shared by both growth charts ───────────────────────

function TimeRangeTabs({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            value === r.key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

// ─── Chart tooltip — dark-surface themed, text stays in text tokens ───────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-500 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-400">{p.name}</span>
          <span className="text-white font-semibold ml-auto pl-3">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Growth chart — area chart, 2 fixed series, hover tooltip, legend ─────────

function GrowthChart({
  title, data, series, emptyMessage,
}: {
  title: string
  data: Array<Record<string, any>>
  series: Array<{ key: string; label: string; color: string }>
  emptyMessage?: string
}) {
  const isEmpty = !!emptyMessage && data.every((d) => series.every((s) => (d[s.key] ?? 0) === 0))

  return (
    <Card className="bg-zinc-900 border-zinc-800 py-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          {/* Legend — always present for 2+ series; swatch carries identity, text stays plain */}
          <div className="flex items-center gap-3">
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[11px] text-zinc-400">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {isEmpty ? (
          <div className="h-56 flex items-center justify-center">
            <p className="text-zinc-600 text-xs text-center max-w-xs leading-relaxed">{emptyMessage}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="#27272a" strokeWidth={1} vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 10, fill: "#71717a" }}
                tickLine={false} axisLine={{ stroke: "#3f3f46" }} minTickGap={24} />
              <YAxis stroke="#71717a" tick={{ fontSize: 10, fill: "#71717a" }}
                tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#52525b", strokeWidth: 1 }} />
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#grad-${s.key})`}
                  dot={false}
                  activeDot={{ r: 4, fill: s.color, stroke: "#18181b", strokeWidth: 2 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MarketplaceAnalytics() {
  const [data, setData] = useState<MarketplaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [growth, setGrowth] = useState<GrowthData | null>(null)
  const [growthLoading, setGrowthLoading] = useState(true)
  const [range, setRange] = useState<TimeRange>("30d")

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

  async function fetchGrowth(r: TimeRange) {
    try {
      setGrowthLoading(true)
      const res = await fetch(`/api/admin/analytics/growth?range=${r}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setGrowth(await res.json())
    } catch {
      setGrowth(null)
    } finally {
      setGrowthLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { fetchGrowth(range) }, [range])

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

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Marketplace Overview</h1>
          <p className="text-zinc-600 text-xs">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading…"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}
          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 h-7 text-xs">
          <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "…" : "Refresh"}
        </Button>
      </div>

      {/* Key metrics — growth/traction numbers, the ones a valuation conversation starts with */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
          <TrendingUp className="h-3 w-3" />Key Metrics
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Hero title="Total Users" value={data.totalUsers} icon={Users} />
          <Hero title="Jobs Posted" value={data.totalJobsPosted} icon={Briefcase} />
          <Hero title="Jobs Completed" value={data.totalJobsCompleted} icon={CheckCircle2} />
          <Hero title="Revenue" value="—" icon={PoundSterling} note="Coming soon" muted />
        </div>
      </div>

      {/* Growth charts — shared time-range switcher drives both */}
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-blue-400">
            <TrendingUp className="h-3 w-3" />Growth
          </div>
          <TimeRangeTabs value={range} onChange={setRange} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {growthLoading || !growth ? (
            <>
              <div className="h-[298px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
              <div className="h-[298px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
            </>
          ) : (
            <>
              <GrowthChart
                title="Registration Growth"
                data={growth.registrationGrowth}
                series={[
                  { key: "homeowners", label: "Homeowners", color: SERIES_BLUE },
                  { key: "tradespeople", label: "Tradespeople", color: SERIES_AQUA },
                ]}
                emptyMessage="No registrations in this period."
              />
              <GrowthChart
                title="Website Visitors"
                data={growth.visitorGrowth}
                series={[
                  { key: "visitors", label: "Visitors", color: SERIES_BLUE },
                  { key: "signups", label: "Signups", color: SERIES_AQUA },
                ]}
                emptyMessage={
                  growth.hasVisitorData
                    ? "No visits in this period."
                    : "Visitor tracking just went live — data will start showing up here as people browse the site."
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Marketplace composition */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-widest text-blue-400">
          Marketplace Composition
        </div>
        <div className="grid grid-cols-2 gap-3">
          <K title="Homeowners" value={data.totalHomeowners} icon={Users} accent="cyan" />
          <K title="Tradespeople" value={data.totalTradespeople} icon={Hammer} accent="purple" />
        </div>
      </div>

      {/* Most popular jobs */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-widest text-blue-400">
          <TrendingUp className="h-3 w-3" />Most Popular Jobs
        </div>
        <Card className="bg-zinc-900 border-zinc-800 py-0">
          <CardContent className="p-4">
            <PopularJobsList jobs={data.mostPopularJobs} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Loading skeleton ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-1.5"><div className="h-7 w-56 bg-zinc-800 rounded" /><div className="h-3 w-32 bg-zinc-800 rounded" /></div>
        <div className="h-7 w-20 bg-zinc-800 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-xl" />)}
      </div>
      <div className="h-56 bg-zinc-900 border border-zinc-800 rounded-xl" />
    </div>
  )
}
