export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  MessageCircle,
  Eye,
  XCircle,
  CheckCircle2,
  ChevronRight,
  Star,
  Home,
  Users,
  Clock,
} from "lucide-react"
import { DeleteJobInlineButton } from "@/components/delete-job-inline-button"

// A job belongs in "History" if it's inactive OR has a terminal status
const CLOSED_STATUSES = new Set(["closed", "filled", "expired", "cancelled", "completed"])
function isClosed(job: any): boolean {
  if (!job.is_active) return true
  const s = (job.status ?? "").toLowerCase()
  return CLOSED_STATUSES.has(s)
}

export default async function HomeownerJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
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
    .select("id, title, location, is_active, created_at, applications_count, views_count, status, expires_at")
    .eq("homeowner_id", hp.id)
    .order("created_at", { ascending: false })

  const allJobs = jobs || []
  const showHistory = search.status === "closed"

  const activeJobs = allJobs.filter((j) => !isClosed(j))
  const closedJobs = allJobs.filter(isClosed)
  const displayJobs = showHistory ? closedJobs : activeJobs

  const returnUrl = showHistory
    ? "/dashboard/homeowner/jobs?status=closed"
    : "/dashboard/homeowner/jobs"

  // ── Status config ─────────────────────────────────────────────────────────
  function getStatusConfig(job: any) {
    if (isClosed(job)) return {
      label: "Closed",
      sub: "No longer visible to tradespeople",
      badge: "bg-slate-700/60 text-slate-400 border-slate-600/50",
      icon: <XCircle className="h-4 w-4 text-slate-500" />,
    }
    const dbStatus = (job.status ?? "").toUpperCase()
    if (dbStatus === "CONFIRMED") return {
      label: "Confirmed",
      sub: "Tradesperson selected",
      badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      icon: <CheckCircle2 className="h-4 w-4 text-blue-400" />,
    }
    const apps = job.applications_count ?? 0
    if (apps > 0) return {
      label: "Reviewing",
      sub: `${apps} applicant${apps !== 1 ? "s" : ""} — tap View`,
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <Users className="h-4 w-4 text-amber-400" />,
    }
    return {
      label: "Open",
      sub: "Waiting for applications",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <Briefcase className="h-4 w-4 text-emerald-400" />,
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">

      {/* ── Header ── */}
      <div className="bg-slate-800 border-b border-slate-700/50">
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

        {/* Tab strip */}
        <div className="flex border-t border-slate-700/50">
          <Link
            href="/dashboard/homeowner/jobs"
            className={`flex-1 text-center py-2.5 text-sm font-medium border-b-2 transition-colors ${
              !showHistory
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Active jobs{activeJobs.length > 0 && ` (${activeJobs.length})`}
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

      {/* ── Job list ── */}
      {allJobs.length === 0 ? (
        <div className="mx-4 mt-8 bg-slate-800/80 border border-slate-700/50 rounded-2xl p-8 text-center">
          <Briefcase className="h-12 w-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-300 mb-1">No jobs posted yet</h3>
          <p className="text-sm text-slate-500 mb-5">
            Post your first job from the home page or tap the&nbsp;
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
      ) : displayJobs.length === 0 ? (
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
        <div className="px-4 py-4 space-y-3">
          {displayJobs.map((job) => {
            const sc = getStatusConfig(job)
            return (
              <div key={job.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                {/* Card body */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className="flex-shrink-0 mt-0.5">{sc.icon}</div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white leading-snug">{job.title}</p>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sc.badge}`}>
                          {sc.label}
                        </span>
                      </div>

                      {/* Status sub-label */}
                      <p className="text-xs text-slate-500 mt-0.5">{sc.sub}</p>

                      {/* Location + date */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                        {job.location && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          {new Date(job.created_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Users className="h-3 w-3" />
                          {job.applications_count ?? 0} applicant{(job.applications_count ?? 0) !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Eye className="h-3 w-3" />
                          {job.views_count ?? 0} view{(job.views_count ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
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

                  {showHistory && (
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
  )
}
