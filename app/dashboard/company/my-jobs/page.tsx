import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { ArrowLeft, MapPin, Clock, CheckCircle2, Briefcase, MessageCircle, History } from "lucide-react"
import Link from "next/link"
import { MarkTradespersonJobsViewed } from "@/components/mark-tradesperson-jobs-viewed"
import { MarkJobCompleteButton } from "@/components/mark-job-complete-button"
import { ReviewHomeownerButton } from "@/components/review-homeowner-button"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function CompanyMyJobsPage({ searchParams }: PageProps) {
  const { tab } = await searchParams
  const activeTab = tab === "history" ? "history" : "active"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!profile) redirect("/onboarding")

  // Active = CONFIRMED (homeowner confirmed us, job in progress)
  // History = COMPLETED
  const statusFilter = activeTab === "history" ? ["COMPLETED"] : ["CONFIRMED", "ACTIVE"]

  const { data: jobs } = await supabase
    .from("jobs")
    .select(`
      id, title, location, budget_min, budget_max, status,
      confirmed_at, completed_at,
      homeowner_profiles!homeowner_id ( first_name, last_name, user_id )
    `)
    .eq("confirmed_tradesperson_id", profile.id)
    .in("status", statusFilter)
    .order("confirmed_at", { ascending: false })

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()}–£${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  const formatDate = (d?: string) => {
    if (!d) return null
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mark jobs as viewed when on active tab */}
      {activeTab === "active" && <MarkTradespersonJobsViewed />}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/company"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-base font-bold text-white ml-1">My Jobs</h1>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
            {jobs?.length ?? 0}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1">
          <Link
            href="/dashboard/company/my-jobs?tab=active"
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors ${
              activeTab === "active"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </Link>
          <Link
            href="/dashboard/company/my-jobs?tab=history"
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors ${
              activeTab === "history"
                ? "bg-slate-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History
          </Link>
        </div>

        {/* Empty state */}
        {!jobs || jobs.length === 0 ? (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-5 py-14 text-center">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300 mb-1">
              {activeTab === "history" ? "No completed jobs yet" : "No active jobs yet"}
            </p>
            <p className="text-xs text-slate-500 mb-5">
              {activeTab === "history"
                ? "Completed jobs will appear here."
                : "When a homeowner confirms you for a job it will appear here."}
            </p>
            {activeTab === "active" && (
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Browse Jobs
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job: any) => {
              const isCompleted = job.status === "COMPLETED"
              const homeowner = job.homeowner_profiles
              const posterName = homeowner
                ? `${homeowner.first_name} ${homeowner.last_name}`.trim()
                : "Homeowner"
              const budget = formatBudget(job.budget_min, job.budget_max)
              const dateLabel = isCompleted
                ? `Completed ${formatDate(job.completed_at)}`
                : `Confirmed ${formatDate(job.confirmed_at)}`

              return (
                <div
                  key={job.id}
                  className={`bg-slate-800/80 border rounded-2xl p-4 flex gap-3 ${
                    isCompleted ? "border-slate-700/40" : "border-emerald-500/25"
                  }`}
                >
                  {/* Status dot */}
                  <div className="flex-shrink-0 pt-0.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${isCompleted ? "bg-blue-400" : "bg-emerald-400"}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title + status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white leading-snug">{job.title}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        isCompleted
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      }`}>
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {isCompleted ? "Completed" : "Active"}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {job.location && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {dateLabel}
                      </span>
                      {budget && (
                        <span className="text-xs font-semibold text-emerald-400">
                          {budget}
                        </span>
                      )}
                    </div>

                    {posterName && (
                      <p className="text-xs text-slate-500 mt-0.5">Posted by {posterName}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {homeowner?.user_id && (
                        <Link
                          href={`/messages/${homeowner.user_id}?job=${job.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Message
                        </Link>
                      )}
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                      >
                        View Job
                      </Link>
                      {!isCompleted && (
                        <MarkJobCompleteButton jobId={job.id} jobTitle={job.title} />
                      )}
                      {isCompleted && homeowner?.user_id && (
                        <ReviewHomeownerButton
                          jobId={job.id}
                          jobTitle={job.title}
                          homeownerUserId={homeowner.user_id}
                          homeownerName={posterName}
                        />
                      )}
                    </div>
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
