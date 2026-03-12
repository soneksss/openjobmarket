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
} from "lucide-react"

export default async function HomeownerJobsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: hp } = await supabase
    .from("homeowner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!hp) redirect("/dashboard/homeowner")

  // Fetch all jobs with application counts
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, location, is_active, created_at, applications_count, views_count, status")
    .eq("homeowner_id", hp.id)
    .order("created_at", { ascending: false })

  const allJobs = jobs || []
  const showHistory = searchParams.status === "closed"

  const activeJobs = allJobs.filter((j) => j.is_active)
  const closedJobs = allJobs.filter((j) => !j.is_active)
  const displayJobs = showHistory ? closedJobs : activeJobs

  const pageTitle = showHistory ? "Job History" : "My Jobs"

  // ── Status badge helper ──────────────────────────────────────────────────────
  function StatusBadge({ job }: { job: any }) {
    if (!job.is_active)
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Closed</span>
    const apps = job.applications_count ?? 0
    if (apps > 0)
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">Reviewing</span>
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Open</span>
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
          <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>
          <span className="ml-auto text-sm text-slate-500">{displayJobs.length} {showHistory ? "closed" : "active"}</span>
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
            Active
          </Link>
          <Link
            href="/dashboard/homeowner/jobs?status=closed"
            className={`flex-1 text-center py-2.5 text-sm font-medium border-b-2 transition-colors ${
              showHistory
                ? "border-slate-400 text-slate-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            History
          </Link>
        </div>
      </div>

      {/* ── Job list ── */}
      {allJobs.length === 0 ? (
        /* No jobs at all */
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
        /* Tab empty state */
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
        <div className="divide-y divide-slate-800/80">
          {displayJobs.map((job) => (
            <div key={job.id} className="bg-slate-900 px-4 py-4">
              {/* Title row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {showHistory ? (
                    <XCircle className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Briefcase className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                    {job.location && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {job.location}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-0.5">
                      {new Date(job.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <StatusBadge job={job} />
              </div>

              {/* Meta */}
              {!showHistory && (
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3 pl-8">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {job.applications_count ?? 0} applications
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {job.views_count ?? 0} views
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pl-8">
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex-1 text-center text-xs font-medium py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                >
                  View
                </Link>
                {showHistory ? (
                  <Link
                    href={`/reviews/new?job=${job.id}`}
                    className="flex-1 text-center text-xs font-medium py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors border border-amber-500/20 flex items-center justify-center gap-1"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Leave Review
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/dashboard/homeowner/jobs/${job.id}`}
                      className="flex-1 text-center text-xs font-medium py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 flex items-center justify-center gap-1"
                    >
                      Manage
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
