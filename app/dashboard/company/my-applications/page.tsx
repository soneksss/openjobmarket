import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Briefcase, ArrowLeft, MapPin, Clock, DollarSign, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { JobExpiryBadge } from "@/components/job-expiry-badge"
import { MarkTradespersonJobsViewed } from "@/components/mark-tradesperson-jobs-viewed"

export default async function CompanyMyApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) redirect("/onboarding")

  const { data: applications } = await supabase
    .from("job_applications")
    .select(`
      id, status, applied_at, cover_letter,
      jobs (
        id, title, location, budget_min, budget_max, status, expires_at,
        is_tradespeople_job, confirmed_tradesperson_id,
        company_profiles!company_id ( company_name, logo_url ),
        homeowner_profiles!homeowner_id ( first_name, last_name )
      )
    `)
    .eq("company_id", profile.id)
    .order("applied_at", { ascending: false })

  const appStatusConfig: Record<string, { label: string; className: string; icon: any }> = {
    PENDING:        { label: "Pending",       className: "bg-amber-500/20 text-amber-400 border-amber-500/30",   icon: Clock },
    REVIEWED:       { label: "Reviewed",      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",     icon: AlertCircle },
    ACCEPTED:       { label: "Accepted",      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
    REJECTED:       { label: "Rejected",      className: "bg-red-500/20 text-red-400 border-red-500/30",        icon: XCircle },
    AUTO_CANCELLED: { label: "Not Selected",  className: "bg-slate-600/30 text-slate-400 border-slate-600/40", icon: XCircle },
    WITHDRAWN:      { label: "Withdrawn",     className: "bg-slate-600/30 text-slate-400 border-slate-600/40", icon: XCircle },
  }

  const jobStatusConfig: Record<string, { label: string; className: string }> = {
    CONFIRMED:  { label: "Confirmed",  className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    COMPLETED:  { label: "Completed",  className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    CANCELLED:  { label: "Cancelled",  className: "bg-red-500/20 text-red-400 border-red-500/30" },
  }

  const formatDate = (d: string) => {
    const diff = Math.ceil((Date.now() - new Date(d).getTime()) / 86400000)
    if (diff <= 1) return "Today"
    if (diff < 7) return `${diff}d ago`
    if (diff < 30) return `${Math.ceil(diff / 7)}w ago`
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()}–£${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <MarkTradespersonJobsViewed />
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
          <h1 className="text-base font-bold text-white ml-1">My Applications</h1>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
            {applications?.length ?? 0}
          </span>
        </div>

        {/* Empty state */}
        {!applications || applications.length === 0 ? (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-5 py-14 text-center">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300 mb-1">No applications yet</p>
            <p className="text-xs text-slate-500 mb-5">Browse available jobs and apply to get started.</p>
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map((application) => {
              const job = application.jobs as any
              if (!job) return null

              const appCfg = appStatusConfig[application.status?.toUpperCase() ?? ""] ?? {
                label: application.status,
                className: "bg-slate-600/30 text-slate-400 border-slate-600/40",
                icon: AlertCircle,
              }
              const AppIcon = appCfg.icon

              const jobCfg = jobStatusConfig[job.status ?? ""]

              const posterName = job.company_profiles?.company_name
                ?? (job.homeowner_profiles ? `${job.homeowner_profiles.first_name} ${job.homeowner_profiles.last_name}` : null)
                ?? "Unknown"
              const logoUrl = job.company_profiles?.logo_url ?? null
              const initials = posterName.slice(0, 2).toUpperCase()
              const budget = formatBudget(job.budget_min, job.budget_max)

              // Is this company the confirmed tradesperson?
              const isConfirmedForThisJob = job.confirmed_tradesperson_id === profile.id

              return (
                <div
                  key={application.id}
                  className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex gap-3"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {logoUrl ? (
                      <div className="h-10 w-10 relative rounded-xl overflow-hidden">
                        <Image src={logoUrl} alt={posterName} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white leading-snug truncate">{job.title}</p>
                      {/* Application status badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${appCfg.className}`}>
                        <AppIcon className="w-2.5 h-2.5" />
                        {appCfg.label}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {job.location && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(application.applied_at)}
                      </span>
                      {budget && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <DollarSign className="w-3 h-3" />
                          {budget}
                        </span>
                      )}
                    </div>

                    {/* Expiry countdown — only for pending applications on active jobs */}
                    {application.status === "PENDING" && job.expires_at && new Date(job.expires_at) > new Date() && (
                      <div className="mt-1.5">
                        <JobExpiryBadge expiresAt={job.expires_at} />
                      </div>
                    )}

                    {/* Job status badge (only for meaningful states) */}
                    {(jobCfg || isConfirmedForThisJob) && (
                      <div className="mt-1.5">
                        <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isConfirmedForThisJob && !jobCfg
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : jobCfg?.className
                        }`}>
                          {isConfirmedForThisJob && job.status !== "COMPLETED"
                            ? "You're confirmed for this job"
                            : jobCfg?.label}
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/applications/${application.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        View Application
                      </Link>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                      >
                        View Job
                      </Link>
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
