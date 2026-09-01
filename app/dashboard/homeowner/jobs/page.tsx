export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Briefcase, MapPin, Eye,
  XCircle, CheckCircle2, ChevronRight,
  Star, Home, Users, Clock, Zap, Calendar,
  MessageCircle,
} from "lucide-react"
import { DeleteJobInlineButton } from "@/components/delete-job-inline-button"
import { MarkJobNotifsRead } from "@/components/mark-job-notifs-read"
import { FlexibleJobConfirmBanner } from "@/components/flexible-job-confirm-banner"

const CLOSED_STATUSES = new Set(["closed", "filled", "expired", "cancelled", "completed"])
function isClosed(job: any): boolean {
  if (!job.is_active) return true
  const s = (job.status ?? "").toLowerCase()
  if (CLOSED_STATUSES.has(s)) return true
  if (job.completion_status === "completed") return true
  if (job.expires_at && new Date(job.expires_at) < new Date()) return true
  return false
}

export default async function HomeownerJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; posted?: string }>
}) {
  const search = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: hp } = await supabase
    .from("homeowner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!hp) redirect("/dashboard/homeowner")

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, location, is_active, created_at, applications_count, views_count, status, completion_status, expires_at, urgency_type, confirmed_tradesperson_id")
    .eq("homeowner_id", hp.id)
    .order("created_at", { ascending: false })
    .limit(200)

  const allJobs = jobs || []

  // Real applicant counts (exclude cancelled/withdrawn)
  const jobIds = allJobs.map((j: any) => j.id)
  const appCountMap = new Map<string, number>()
  if (jobIds.length > 0) {
    const { data: appRows } = await supabase
      .from("job_applications")
      .select("job_id")
      .in("job_id", jobIds)
      .not("status", "in", '("AUTO_CANCELLED","WITHDRAWN")')
    for (const row of appRows ?? []) {
      appCountMap.set(row.job_id, (appCountMap.get(row.job_id) ?? 0) + 1)
    }
  }

  const showHistory  = search.status === "closed"
  const newlyPostedId = search.posted ?? null

  const activeJobs  = allJobs.filter((j: any) => !isClosed(j))
  const closedJobs  = allJobs.filter(isClosed)
  const displayJobs = showHistory ? closedJobs : activeJobs

  // Job that just got posted (for confirmation banner)
  const newlyPostedJob = newlyPostedId
    ? allJobs.find((j: any) => j.id === newlyPostedId) ?? null
    : null

  const returnUrl = showHistory
    ? "/dashboard/homeowner/jobs?status=closed"
    : "/dashboard/homeowner/jobs"

  function getStatusConfig(job: any) {
    const dbStatus = (job.status ?? "").toUpperCase()
    const isCompleted = dbStatus === "COMPLETED" || job.completion_status === "completed"
    if (isCompleted) return {
      label: "Completed", dot: "bg-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    }
    if (dbStatus === "CANCELLED") return {
      label: "Cancelled", dot: "bg-red-400",
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
    }
    if (isClosed(job)) return {
      label: "Closed", dot: "bg-slate-500",
      badge: "bg-slate-700/60 text-slate-400 border-slate-600/50",
    }
    if (dbStatus === "CONFIRMED") return {
      label: "Confirmed", dot: "bg-blue-400",
      badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    }
    const apps = appCountMap.get(job.id) ?? 0
    if (apps > 0) return {
      label: "Replies", dot: "bg-amber-400",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    }
    return {
      label: "Live", dot: "bg-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    }
  }

  function fmtExpiry(job: any) {
    if (!job.expires_at) return null
    const diff = new Date(job.expires_at).getTime() - Date.now()
    if (diff <= 0) return "Expired"
    if (diff < 60 * 60 * 1000) return `${Math.ceil(diff / 60000)}m left`
    if (diff < 24 * 60 * 60 * 1000) return `${Math.ceil(diff / 3600000)}h left`
    return `${Math.ceil(diff / 86400000)}d left`
  }

  const isUrgent  = (j: any) => j.urgency_type === "asap" || j.urgency_type === "today"
  const isFlexible = (j: any) => j.urgency_type === "flexible"

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      <MarkJobNotifsRead />

      {/* ── Header ── */}
      <div className="bg-slate-800 border-b border-slate-700/50">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 px-4 py-4">
            <Link
              href="/dashboard/homeowner"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-semibold text-white">
              {showHistory ? "Job History" : "My Jobs"}
            </h1>
            <span className="ml-auto text-sm text-slate-500">
              {displayJobs.length} {showHistory ? "closed" : "active"}
            </span>
          </div>

          <div className="flex border-t border-slate-700/50">
            <Link
              href="/dashboard/homeowner/jobs"
              className={`flex-1 text-center py-2.5 text-sm font-medium border-b-2 transition-colors ${
                !showHistory
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Active{activeJobs.length > 0 && ` (${activeJobs.length})`}
            </Link>
            <Link
              href="/dashboard/homeowner/jobs?status=closed"
              className={`flex-1 text-center py-2.5 text-sm font-medium border-b-2 transition-colors ${
                showHistory
                  ? "border-slate-400 text-slate-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              History{closedJobs.length > 0 && ` (${closedJobs.length})`}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">

        {/* ── Flexible job confirmation banner ── */}
        {newlyPostedJob && !showHistory && (
          <FlexibleJobConfirmBanner
            jobId={newlyPostedJob.id}
            jobTitle={newlyPostedJob.title}
          />
        )}

        {/* ── Empty states ── */}
        {allJobs.length === 0 ? (
          <div className="mx-4 mt-8 bg-slate-800/80 border border-slate-700/50 rounded-2xl p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-3 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">No jobs posted yet</h3>
            <p className="text-sm text-slate-500 mb-5">
              Post your first job from the home page or tap the{" "}
              <span className="text-emerald-400 font-medium">+ button</span> in the navigation.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-2.5 transition-colors"
            >
              <Home className="h-4 w-4" />
              Go to Home
            </Link>
          </div>
        ) : displayJobs.length === 0 && !newlyPostedJob ? (
          <div className="mx-4 mt-8 bg-slate-800/50 border border-slate-700/40 rounded-2xl p-8 text-center">
            {showHistory ? (
              <>
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                <p className="text-sm font-medium text-slate-400 mb-1">No closed jobs yet</p>
                <p className="text-xs text-slate-600">Closed and expired jobs will appear here.</p>
              </>
            ) : (
              <>
                <Briefcase className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                <p className="text-sm font-medium text-slate-400 mb-1">No active jobs</p>
                <p className="text-xs text-slate-600 mb-4">All your jobs are closed. Post a new one from home.</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2 transition-colors"
                >
                  <Home className="h-3.5 w-3.5" />
                  Go to Home
                </Link>
              </>
            )}
          </div>
        ) : (

          /* ── Job cards ── */
          <div className={`px-4 space-y-3 ${newlyPostedJob ? "pt-3" : "pt-4"}`}>
            {displayJobs.map((job: any) => {
              const sc      = getStatusConfig(job)
              const apps    = appCountMap.get(job.id) ?? 0
              const expiry  = fmtExpiry(job)
              const urgent  = isUrgent(job)
              const flexible = isFlexible(job)
              const isNew   = job.id === newlyPostedId

              return (
                <div
                  key={job.id}
                  className={`rounded-2xl overflow-hidden border transition-all ${
                    isNew
                      ? "border-emerald-500/40 bg-emerald-950/30 ring-1 ring-emerald-500/20"
                      : "border-slate-700/50 bg-slate-800/60 hover:border-slate-600/60"
                  }`}
                >
                  {/* Card body */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">

                      {/* Left: live dot */}
                      <div className="flex-shrink-0 mt-1.5">
                        <span className={`block w-2.5 h-2.5 rounded-full ${sc.dot} ${
                          !isClosed(job) && sc.label !== "Confirmed" ? "animate-pulse" : ""
                        }`} />
                      </div>

                      {/* Centre: info */}
                      <div className="flex-1 min-w-0">
                        {/* Title row + badges */}
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className="text-sm font-bold text-white leading-snug flex-1 min-w-0">
                            {job.title}
                          </p>
                          {/* Type badges */}
                          {urgent && (
                            <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                              <Zap className="w-2.5 h-2.5 fill-orange-400" />
                              Urgent
                            </span>
                          )}
                          {flexible && (
                            <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              Flexible
                            </span>
                          )}
                        </div>

                        {/* Location + date */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                          {job.location && (
                            <span className="flex items-center gap-1 text-xs text-slate-300">
                              <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                              {job.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-slate-300">
                            <Calendar className="h-3 w-3 flex-shrink-0 text-slate-400" />
                            {new Date(job.created_at).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short",
                            })}
                          </span>
                          {expiry && !isClosed(job) && (
                            <span className={`flex items-center gap-1 text-xs font-medium ${
                              expiry === "Expired" ? "text-red-400" : "text-slate-300"
                            }`}>
                              <Clock className="h-3 w-3 flex-shrink-0 text-slate-400" />
                              {expiry}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: stats column */}
                      <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
                        {/* Replies badge */}
                        {apps > 0 ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25">
                            <Users className="w-3 h-3 text-amber-400" />
                            <span className="text-xs font-bold text-amber-400 leading-none">{apps}</span>
                            <span className="text-[10px] text-amber-300">{apps === 1 ? "reply" : "replies"}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/40 border border-slate-600/30">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-300 leading-none">0</span>
                            <span className="text-[10px] text-slate-400">replies</span>
                          </div>
                        )}
                        {/* Views badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/40 border border-slate-600/30">
                          <Eye className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-300 leading-none">{job.views_count ?? 0}</span>
                          <span className="text-[10px] text-slate-400">views</span>
                        </div>
                      </div>
                    </div>

                    {/* Status strip */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sc.badge}`}>
                        {sc.label}
                      </span>
                      {apps > 0 && (
                        <span className="text-xs text-slate-300">
                          {apps} tradesperson{apps !== 1 ? "s" : ""} responded
                        </span>
                      )}
                      {apps === 0 && !isClosed(job) && (
                        <span className="text-xs text-slate-400">Waiting for replies…</span>
                      )}
                    </div>
                  </div>

                  {/* Action footer */}
                  <div className="flex border-t border-slate-700/40">
                    <Link
                      href={`/dashboard/homeowner/jobs/${job.id}`}
                      className="flex-1 text-center text-xs font-semibold py-2.5 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      View job
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>

                    {apps > 0 && (
                      <>
                        <div className="w-px bg-slate-700/40" />
                        <Link
                          href="/messages"
                          className="flex-1 text-center text-xs font-semibold py-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Messages
                        </Link>
                      </>
                    )}

                    {showHistory && job.status?.toUpperCase() === "CANCELLED" && (
                      <>
                        <div className="w-px bg-slate-700/40" />
                        <Link
                          href="/jobs/new"
                          className="flex-1 text-center text-xs font-semibold py-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Post again
                        </Link>
                      </>
                    )}

                    {showHistory && (job.status?.toUpperCase() === "COMPLETED" || job.completion_status === "completed") && (
                      <>
                        <div className="w-px bg-slate-700/40" />
                        <Link
                          href={`/reviews/new?job=${job.id}`}
                          className="flex-1 text-center text-xs font-semibold py-2.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Review
                        </Link>
                      </>
                    )}

                    <div className="w-px bg-slate-700/40" />
                    <DeleteJobInlineButton
                      jobId={job.id}
                      jobTitle={job.title}
                      returnUrl={returnUrl}
                      triggerClassName="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
