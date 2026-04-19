"use client"

import Link from "next/link"
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Star,
  Users,
  ChevronLeft,
  Eye,
  Clock,
  Award,
} from "lucide-react"

interface StatisticsProps {
  companyName: string
  stats: {
    totalApplied:     number
    confirmed:        number
    confirmRate:      number
    completed:        number
    last7Days:        number
    repeatHomeowners: number
    profileViews:     number
    avgResponseTime:  string
    avgRating:        number
    totalReviews:     number
  }
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className={`rounded-xl border bg-slate-800/80 p-3 flex flex-col gap-1.5 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase leading-tight">{label}</span>
        <div className={`flex items-center justify-center w-6 h-6 rounded-lg ${color.replace("border-", "bg-").replace("/30", "/20")}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight text-white leading-none">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 leading-tight">{sub}</div>}
    </div>
  )
}

function RateBadge({ rate }: { rate: number }) {
  const color =
    rate >= 40 ? "text-emerald-400 bg-emerald-500/20 border-emerald-500/30" :
    rate >= 20 ? "text-amber-400 bg-amber-500/20 border-amber-500/30" :
                 "text-slate-400 bg-slate-700 border-slate-600"
  const label =
    rate >= 40 ? "Excellent" :
    rate >= 20 ? "Good" :
    rate >= 10 ? "Building up" : "Getting started"

  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  )
}

export function CompanyStatistics({ companyName, stats }: StatisticsProps) {
  const {
    totalApplied, confirmed, confirmRate, completed,
    last7Days, repeatHomeowners, profileViews,
    avgResponseTime, avgRating, totalReviews,
  } = stats

  const stars = avgRating > 0 ? avgRating.toFixed(1) : "—"

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard/company" className="text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-sm font-bold text-white">Business Statistics</h1>
          <p className="text-[11px] text-slate-400">{companyName}</p>
        </div>
        <div className="ml-auto">
          <BarChart3 className="h-5 w-5 text-purple-400" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-3 space-y-2.5">

        {/* Confirmation rate — compact hero */}
        <div className="rounded-xl bg-gradient-to-br from-purple-600/30 to-indigo-600/20 border border-purple-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] text-purple-300 font-medium uppercase tracking-wide">Confirmation Rate</p>
              <div className="text-4xl font-black text-white mt-0.5 leading-none">{confirmRate}%</div>
              <p className="text-[10px] text-slate-400 mt-1">
                {confirmed} won · {totalApplied} applied
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <RateBadge rate={confirmRate} />
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                <span className="text-sm font-bold">{stars}</span>
                {totalReviews > 0 && <span className="text-[10px] text-slate-400">({totalReviews})</span>}
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400"
              style={{ width: `${Math.min(100, confirmRate)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 mt-1">
            <span>0%</span><span>Target 40%+</span><span>100%</span>
          </div>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-2.5">
          <KpiCard
            icon={CheckCircle2}
            label="Confirmed"
            value={confirmed}
            sub="jobs won"
            color="border-emerald-500/30"
          />
          <KpiCard
            icon={Clock}
            label="Avg Response"
            value={avgResponseTime}
            sub="to homeowner msg"
            color="border-sky-500/30"
          />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-2.5">
          <KpiCard
            icon={Award}
            label="Completed"
            value={completed}
            sub="jobs finished"
            color="border-teal-500/30"
          />
          <KpiCard
            icon={Users}
            label="Repeat Clients"
            value={repeatHomeowners}
            sub="homeowners returned"
            color="border-amber-500/30"
          />
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-2 gap-2.5">
          <KpiCard
            icon={TrendingUp}
            label="Last 7 Days"
            value={last7Days}
            sub="applications sent"
            color="border-blue-500/30"
          />
          <KpiCard
            icon={Eye}
            label="Profile Views"
            value={profileViews}
            sub="this week"
            color="border-purple-500/30"
          />
        </div>

        {/* Tip: only show if very few applications — keeps screen clean */}
        {totalApplied < 5 && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 flex items-start gap-2.5 mt-1">
            <Briefcase className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-300 mb-0.5">Getting started</p>
              <p className="text-[11px] text-slate-400">
                Fast replies get 3× more confirmations. Turn on Instant Alerts so you never miss a job.
              </p>
              <Link href="/" className="inline-block mt-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300">
                Browse trade jobs →
              </Link>
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
