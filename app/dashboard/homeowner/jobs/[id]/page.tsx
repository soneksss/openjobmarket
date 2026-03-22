// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient, createAdminClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  Zap,
  Users,
  Eye,
} from "lucide-react"
import { HomeownerJobActions } from "@/components/homeowner-job-actions"
import { HomeownerJobDetailsContent } from "@/components/homeowner-job-details-content"
import { JobCountdownTimer } from "@/components/job-countdown-timer"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function HomeownerJobDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) redirect("/onboarding")

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      id, title, description, short_description, location, latitude, longitude,
      budget_min, budget_max, budget_period, is_active, expires_at, created_at,
      updated_at, is_tradespeople_job, work_location, homeowner_id, job_photo_url,
      accepted_contractor_id, confirmed_tradesperson_id, completed_at, completion_status, status,
      urgency_type, max_responses, applications_count, views_count
    `)
    .eq("id", id)
    .eq("homeowner_id", profile.id)
    .single()

  if (jobError || !job) notFound()

  let responseCount = 0
  if (job.is_tradespeople_job && job.urgency_type === 'flexible' && job.max_responses) {
    const { data: responders } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('job_id', id)
      .eq('sender_role', 'tradesperson')
    responseCount = new Set(responders?.map((r: any) => r.sender_id) || []).size
  }

  // Use admin client to bypass RLS — homeowner ownership already verified above
  const admin = createAdminClient()

  // Step 1: Fetch application rows without PostgREST join hints
  // (avoid company_profiles!company_id syntax which requires an explicit FK constraint)
  const { data: appRows, error: appsError } = await admin
    .from("job_applications")
    .select("id, status, applied_at, cover_letter, company_id, tradesperson_id")
    .eq("job_id", id)
    .order("applied_at", { ascending: false })

  if (appsError) {
    console.error("[HOMEOWNER-JOB] applications fetch error:", appsError.message, appsError.code)
  }

  // Step 2: Fetch company profiles for each applicant
  // apply_to_job sets both company_id and tradesperson_id to the same company_profiles.id
  // fall back to tradesperson_id if company_id is null
  const resolvedProfileId = (a: any) => a.company_id ?? a.tradesperson_id ?? null
  const profileIds = [...new Set((appRows ?? []).map(resolvedProfileId).filter(Boolean))]

  let cpMap: Record<string, any> = {}
  if (profileIds.length > 0) {
    // First: try matching by company_profiles.id (normal path)
    const { data: cpById } = await admin
      .from("company_profiles")
      .select("id, user_id, company_name, logo_url, location")
      .in("id", profileIds)

    ;(cpById ?? []).forEach((r: any) => { cpMap[r.id] = r })

    // Second: for any IDs that didn't match, try matching as user_id
    // (handles older apply_to_job versions that stored auth.uid() instead of profile.id)
    const unmatched = profileIds.filter(pid => !cpMap[pid])
    if (unmatched.length > 0) {
      const { data: cpByUserId } = await admin
        .from("company_profiles")
        .select("id, user_id, company_name, logo_url, location")
        .in("user_id", unmatched)
      ;(cpByUserId ?? []).forEach((r: any) => {
        // map the stored uid → profile, so the lookup below works
        cpMap[r.user_id] = r
        cpMap[r.id]      = r
      })
    }
  }

  const applications = (appRows ?? []).map((a: any) => {
    const pid = resolvedProfileId(a)
    const profile = pid ? (cpMap[pid] ?? null) : null
    return {
      ...a,
      company_profiles:      profile,
      contractor_profiles:   null,
      professional_profiles: null,
    }
  })

  // Real applicant count — exclude cancelled/withdrawn (applications_count column can be stale)
  const activeAppCount = (appRows ?? []).filter(
    (a: any) => a.status !== "AUTO_CANCELLED" && a.status !== "WITHDRAWN"
  ).length

  const now = new Date()
  const expiresAt = job.expires_at ? new Date(job.expires_at) : null
  const isExpired = expiresAt ? expiresAt < now : false
  // A job posted in the last 2 minutes is treated as active even if is_active
  // hasn't propagated yet (DB trigger latency on first insert)
  const justPosted = (now.getTime() - new Date(job.created_at).getTime()) < 2 * 60 * 1000
  const isActive = (job.is_active || justPosted) && !isExpired

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  const expiryDiffMs = expiresAt ? expiresAt.getTime() - now.getTime() : null
  const expiryLabel = expiryDiffMs === null ? null
    : expiryDiffMs < 0
      ? (() => {
          const hrs = Math.floor(Math.abs(expiryDiffMs) / (1000 * 60 * 60))
          const days = Math.floor(hrs / 24)
          return days > 0 ? `Expired ${days}d ago` : `Expired ${hrs}h ago`
        })()
    : expiryDiffMs < 60 * 60 * 1000
      ? `Expires in ${Math.ceil(expiryDiffMs / (1000 * 60))}m`
    : expiryDiffMs < 24 * 60 * 60 * 1000
      ? `Expires in ${Math.ceil(expiryDiffMs / (1000 * 60 * 60))}h`
    : `Expires in ${Math.ceil(expiryDiffMs / (1000 * 60 * 60 * 24))}d`

  const budgetLabel = job.budget_min && job.budget_max
    ? `£${job.budget_min}–£${job.budget_max}`
    : job.budget_min ? `£${job.budget_min}+`
    : job.budget_max ? `Up to £${job.budget_max}`
    : null

  const displayDescription = (job.short_description || job.description || "").trim()

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Top bar: back link + compact action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Link
            href="/dashboard/homeowner/jobs"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to my jobs</span>
          </Link>

          <HomeownerJobActions
            jobId={job.id}
            jobTitle={job.title}
            isActive={!!isActive}
            expiresAt={job.expires_at}
            jobStatus={job.status}
            isFlexibleJob={!!(job.is_tradespeople_job && job.urgency_type === "flexible")}
            urgencyType={job.urgency_type ?? undefined}
            currentJob={{
              title: job.title,
              description: job.description,
              short_description: job.short_description,
              location: job.location,
              latitude: job.latitude,
              longitude: job.longitude,
              budget_min: job.budget_min,
              budget_max: job.budget_max,
              budget_period: job.budget_period,
              work_location: job.work_location,
              job_photo_url: job.job_photo_url,
            }}
          />
        </div>

        {/* Header card */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5">
          {/* Status chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isActive
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-slate-700/60 text-slate-400 border-slate-600/50"
            }`}>
              {isActive ? "Active" : "Expired"}
            </span>
            {job.is_tradespeople_job && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Tradespeople Job
              </span>
            )}
            {job.urgency_type === "urgent" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                <Zap className="w-3 h-3 fill-orange-400" />
                Urgent
              </span>
            )}
            {job.is_tradespeople_job && job.urgency_type === "flexible" && job.max_responses && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Users className="w-3 h-3" />
                {responseCount}/{job.max_responses} responses
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold text-white mb-4">{job.title}</h1>

          {/* Countdown timer — only for urgent jobs still within their window */}
          {job.urgency_type === "urgent" && job.expires_at && isActive && (
            <div className="mb-4">
              <JobCountdownTimer expiresAt={job.expires_at} totalMs={30 * 60 * 1000} />
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
            {budgetLabel && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 font-semibold">
                {budgetLabel}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
              Posted {formatDate(job.created_at)}
            </div>
            {expiryLabel && (
              <div className={`flex items-center gap-2 text-sm font-medium ${isActive ? "text-slate-400" : "text-red-400"}`}>
                <Clock className="w-4 h-4 flex-shrink-0" />
                {expiryLabel}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
              {activeAppCount} applicant{activeAppCount !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Eye className="w-4 h-4 text-slate-500 flex-shrink-0" />
              {job.views_count || 0} view{(job.views_count || 0) !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Live search button (urgent jobs) */}
          {job.is_tradespeople_job && job.urgency_type === "urgent" && isActive && (
            <Link
              href={`/jobs/${job.id}/live`}
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-semibold hover:bg-orange-500/25 transition-colors"
            >
              <Zap className="w-4 h-4 fill-orange-400" />
              View Live Search
            </Link>
          )}
        </div>

        {/* Job photo */}
        {job.job_photo_url && (
          <div className="rounded-2xl overflow-hidden border border-slate-700/60">
            <img
              src={job.job_photo_url}
              alt={job.title}
              className="w-full max-h-44 sm:max-h-64 object-cover"
            />
          </div>
        )}

        {/* Description */}
        {displayDescription && (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-2">About this job</h2>
            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap break-words">{displayDescription}</p>
          </div>
        )}

        {/* Applications */}
        <HomeownerJobDetailsContent job={job} applications={applications || []} homeownerUserId={user.id} />

        {/* Expired warning */}
        {!isActive && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/25">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">
                {job.urgency_type === "asap" || job.urgency_type === "today"
                  ? "Search window closed"
                  : "This job has expired"}
              </p>
              <p className="text-xs text-red-400/80 mt-0.5">
                {job.urgency_type === "asap" || job.urgency_type === "today"
                  ? "The 1-hour search window has ended. Use \"Reopen\" above to start a new search window."
                  : "Not visible to tradespeople. Use \"Extend\" above to reactivate it."}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
