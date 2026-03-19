"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Users,
  MessageCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { HomeownerApplicationActions } from "./homeowner-application-actions"
import { JobCompletionModal } from "./job-completion-modal"

interface Application {
  id: string
  status: string
  applied_at: string
  cover_letter?: string
  contractor_id?: string
  professional_id?: string | null
  company_id?: string | null
  contractor_profiles?: any
  professional_profiles?: any
  company_profiles?: any
}

interface JobDetailsContentProps {
  job: any
  applications: Application[]
  homeownerUserId?: string
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:        "bg-amber-500/20 text-amber-400 border-amber-500/30",
  pending:        "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ACCEPTED:       "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  accepted:       "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  REJECTED:       "bg-red-500/20 text-red-400 border-red-500/30",
  rejected:       "bg-red-500/20 text-red-400 border-red-500/30",
  WITHDRAWN:      "bg-slate-500/20 text-slate-400 border-slate-500/30",
  withdrawn:      "bg-slate-500/20 text-slate-400 border-slate-500/30",
  reviewed:       "bg-blue-500/20 text-blue-400 border-blue-500/30",
  REVIEWED:       "bg-blue-500/20 text-blue-400 border-blue-500/30",
}

const INITIAL_SHOW = 3

export function HomeownerJobDetailsContent({ job, applications, homeownerUserId }: JobDetailsContentProps) {
  const [expanded, setExpanded]           = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [selectedContractor, setSelectedContractor]   = useState<{
    id: string; name: string; profileId: string
  } | null>(null)

  const isJobAccepted  = job.completion_status === "accepted" || job.status === "CONFIRMED"
  const isJobCompleted = job.completion_status === "completed"
  // confirmed_tradesperson_id is set by confirm_tradesperson() RPC (urgent/tradespeople jobs)
  // accepted_contractor_id is set for flexible job flows — use whichever is present
  const acceptedContractorId = job.confirmed_tradesperson_id ?? job.accepted_contractor_id

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" })

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return undefined
    if (min && max) return `£${min.toLocaleString()}–£${max.toLocaleString()}`
    if (min) return `From £${min.toLocaleString()}`
    if (max) return `Up to £${max.toLocaleString()}`
  }

  const handleMarkComplete = () => {
    if (!acceptedContractorId) return
    const acceptedApp = applications.find(
      (a: any) => (a.company_id ?? a.tradesperson_id) === acceptedContractorId
    )
    const applicant = acceptedApp ? resolveApplicant(acceptedApp) : null
    setSelectedContractor({
      id:        acceptedContractorId,
      name:      applicant?.name ?? "Tradesperson",
      profileId: applicant?.profileId ?? acceptedContractorId,
    })
    setShowCompletionModal(true)
  }

  // ── Resolve applicant info regardless of profile type ──────────────────
  const resolveApplicant = (app: Application) => {
    if (app.company_profiles) {
      const p = app.company_profiles
      return {
        name:      p.company_name || "Tradesperson",
        title:     p.industry     || "Tradesperson",
        photo:     p.logo_url     || null,
        location:  p.location     || null,
        profileId: p.id,
        userId:    p.user_id,
        profileUrl: `/companies/${p.id}`,
        type:      "company" as const,
        verified:  p.verified,
      }
    }
    if (app.contractor_profiles) {
      const p = app.contractor_profiles
      return {
        name:      p.business_name || "Contractor",
        title:     p.trade_specialties?.[0] || "Contractor",
        photo:     p.profile_picture || null,
        location:  p.location || null,
        profileId: p.id,
        userId:    p.user_id,
        profileUrl: `/contractors/${p.id}`,
        type:      "contractor" as const,
        verified:  false,
      }
    }
    if (app.professional_profiles) {
      const p = app.professional_profiles
      return {
        name:      `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Professional",
        title:     p.title || "Professional",
        photo:     p.profile_photo_url || null,
        location:  p.location || null,
        profileId: p.id,
        userId:    p.user_id,
        profileUrl: `/professionals/${p.id}`,
        type:      "professional" as const,
        verified:  false,
      }
    }
    // Fallback: profile lookup failed but application row exists
    return {
      name:      "Tradesperson",
      title:     "Applied",
      photo:     null,
      location:  null,
      profileId: (app as any).company_id ?? (app as any).tradesperson_id ?? null,
      userId:    null,
      profileUrl: null,
      type:      "company" as const,
      verified:  false,
    }
  }

  const visibleApps = expanded ? applications : applications.slice(0, INITIAL_SHOW)
  const hiddenCount = applications.length - INITIAL_SHOW

  return (
    <>
      {/* ── Job completed banner ── */}
      {isJobCompleted && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Job Completed</p>
            <p className="text-xs text-emerald-400/70 mt-0.5">
              Completed on {formatDate(job.completed_at)}
            </p>
          </div>
        </div>
      )}

      {/* ── Contractor accepted — mark complete CTA ── */}
      {isJobAccepted && !isJobCompleted && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25">
          <div>
            <p className="text-sm font-semibold text-blue-300">Contractor Accepted</p>
            <p className="text-xs text-blue-400/70 mt-0.5">Mark as complete once the work is done</p>
          </div>
          <button
            onClick={handleMarkComplete}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex-shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark Complete
          </button>
        </div>
      )}

      {/* ── Applications card ── */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700/60">
          <Users className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-200">Applications</h2>
          {applications.length > 0 && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {applications.length}
            </span>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">No applications yet</p>
            <p className="text-xs text-slate-600 mt-1">
              When tradespeople apply, they'll appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-700/50">
              {visibleApps.map((app) => {
                const applicant = resolveApplicant(app)

                const initials = applicant.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)

                const isAccepted = acceptedContractorId && acceptedContractorId === applicant.profileId
                const statusStyle = STATUS_STYLE[app.status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30"

                return (
                  <div
                    key={app.id}
                    className={`flex items-start gap-3 px-5 py-4 ${isAccepted ? "bg-emerald-500/5" : ""}`}
                  >
                    {/* Avatar — clickable if profile URL exists */}
                    {applicant.profileUrl ? (
                      <Link href={applicant.profileUrl} className="flex-shrink-0 rounded-full ring-2 ring-transparent hover:ring-white/20 transition-all">
                        <Avatar className="h-11 w-11 border border-white/10">
                          <AvatarImage src={applicant.photo || undefined} alt={applicant.name} />
                          <AvatarFallback className="bg-slate-700 text-slate-300 text-sm font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    ) : (
                      <Avatar className="h-11 w-11 flex-shrink-0 border border-white/10">
                        <AvatarImage src={applicant.photo || undefined} alt={applicant.name} />
                        <AvatarFallback className="bg-slate-700 text-slate-300 text-sm font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {applicant.profileUrl ? (
                          <Link href={applicant.profileUrl} className="text-base font-semibold text-white hover:text-emerald-400 truncate transition-colors">
                            {applicant.name}
                          </Link>
                        ) : (
                          <span className="text-base font-semibold text-white truncate">{applicant.name}</span>
                        )}
                        {applicant.verified && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                        {isAccepted && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-sm text-slate-400 truncate">{applicant.title}</span>
                        {applicant.location && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            {applicant.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock className="w-3 h-3" />
                          {formatDate(app.applied_at)}
                        </span>
                      </div>

                      {/* Status badge */}
                      <div className="mt-1.5">
                        {isAccepted ? (
                          <span className="inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Confirmed
                          </span>
                        ) : app.status === "AUTO_CANCELLED" ? (
                          <span className="inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-slate-500/20 text-slate-500 border-slate-500/30">
                            Not Selected
                          </span>
                        ) : (
                          <span className={`inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusStyle}`}>
                            {app.status.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Cover letter preview */}
                      {app.cover_letter && (
                        <p className="mt-2 text-sm text-slate-400 line-clamp-2 italic">
                          "{app.cover_letter}"
                        </p>
                      )}

                      {/* Actions row */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {homeownerUserId && applicant.userId && !isAccepted && (
                          <Link
                            href={`/messages/${applicant.userId}`}
                            className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-2 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Message
                          </Link>
                        )}

                        {/* Accept/Reject controls — works for both company and contractor applicants */}
                        {applicant.profileId && !isJobCompleted && (
                          <HomeownerApplicationActions
                            applicationId={app.id}
                            contractorId={applicant.profileId}
                            contractorName={applicant.name}
                            jobId={job.id}
                            currentStatus={app.status}
                            isJobAlreadyAccepted={!!acceptedContractorId}
                            acceptedContractorId={acceptedContractorId}
                            jobTitle={job.title}
                            jobBudget={formatBudget(job.budget_min, job.budget_max)}
                            homeownerUserId={homeownerUserId}
                            contractorUserId={applicant.userId}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Show more / less toggle */}
            {applications.length > INITIAL_SHOW && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-slate-400 hover:text-white border-t border-slate-700/60 hover:bg-slate-700/30 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Show {hiddenCount} more applicant{hiddenCount !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Job Completion Modal */}
      {selectedContractor && (
        <JobCompletionModal
          isOpen={showCompletionModal}
          onClose={() => { setShowCompletionModal(false); setSelectedContractor(null) }}
          jobId={job.id}
          jobTitle={job.title}
          contractorId={selectedContractor.id}
          contractorName={selectedContractor.name}
          contractorProfileId={selectedContractor.profileId}
        />
      )}
    </>
  )
}
