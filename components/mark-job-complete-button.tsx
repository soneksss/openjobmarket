"use client"

import { useRef, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/client"
import ReviewSubmissionModal from "@/components/review-submission-modal"
import { TrustpilotReviewPrompt } from "@/components/trustpilot-review-prompt"

interface Props {
  jobId: string
  jobTitle: string
  homeownerUserId?: string | null
  homeownerName?: string
  redirectAfter?: string
}

type Stage = "idle" | "review" | "trustpilot"

export function MarkJobCompleteButton({
  jobId,
  jobTitle,
  homeownerUserId,
  homeownerName = "the homeowner",
  redirectAfter = "/dashboard/company/my-jobs?tab=history",
}: Props) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>("idle")
  const [companyProfileId, setCompanyProfileId] = useState<string | null>(null)
  const reviewHandled = useRef(false)

  const goToHistory = () => { window.location.href = redirectAfter }

  async function handleClick() {
    if (loading) return
    // Single click, with one plain confirm so an accidental tap can't close a job.
    if (!window.confirm(`Mark "${jobTitle}" as completed?`)) return

    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/tradesperson-complete`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.error === "already_completed") { goToHistory(); return }
        setErrorMsg(body.error ?? "Failed to mark complete. Please try again.")
        return
      }
      // Job is COMPLETED. Chain into: rate the homeowner → (first time) Trustpilot.
      if (homeownerUserId) {
        setStage("review")
      } else {
        goToHistory()
      }
    } catch {
      setErrorMsg("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // After the review modal closes: show the Trustpilot prompt once (first
  // completed job only), otherwise go straight to history.
  async function afterReview() {
    if (reviewHandled.current) return
    reviewHandled.current = true
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from("company_profiles")
          .select("id, first_review_prompt_shown")
          .eq("user_id", user.id)
          .maybeSingle()
        if (data && !data.first_review_prompt_shown) {
          setCompanyProfileId(data.id)
          setStage("trustpilot")
          return
        }
      }
    } catch { /* fall through to redirect */ }
    goToHistory()
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {loading ? "Completing…" : "Mark as Completed"}
      </button>
      {errorMsg && (
        <p className="text-xs text-red-400 leading-tight">{errorMsg}</p>
      )}

      {stage === "review" && homeownerUserId && (
        <ReviewSubmissionModal
          isOpen
          onClose={afterReview}
          jobId={jobId}
          jobTitle={jobTitle}
          reviewedUserId={homeownerUserId}
          reviewedUserName={homeownerName}
          reviewedUserType="homeowner"
          reviewerType="company"
          onSuccess={afterReview}
        />
      )}

      {stage === "trustpilot" && companyProfileId && (
        <TrustpilotReviewPrompt
          isOpen
          onClose={goToHistory}
          profileId={companyProfileId}
          profileTable="company_profiles"
        />
      )}
    </div>
  )
}
